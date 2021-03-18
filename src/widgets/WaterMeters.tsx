import { property, subclass } from '@arcgis/core/core/accessorSupport/decorators';
import { whenOnce } from '@arcgis/core/core/watchUtils';

import { renderable, tsx } from '@arcgis/core/widgets/support/widget';

import Widget from '@arcgis/core/widgets/Widget';

import SearchViewModel from '@arcgis/core/widgets/Search/SearchViewModel';

export interface WaterMetersProperties extends esri.WidgetProperties {
  view: esri.MapView;
  layer: esri.FeatureLayer;
}

const CSS = {
  base: 'cov-water-meters',

  heading: 'cov-water-meters--heading',

  row: 'cov-water-meters--row',

  info: 'cov-water-meters--info',
};

let KEY = 0;

@subclass('cov.widgets.WaterMeters')
export default class WaterMeters extends Widget {
  @property()
  view!: esri.MapView | esri.SceneView;

  @property()
  @renderable([
    'layer.labelsVisible'
  ])
  layer!: esri.FeatureLayer;

  @property()
  private _layerView!: esri.FeatureLayerView;

  @property()
  private _searchViewModel!: SearchViewModel;

  @property()
  private _accountDomain!: esri.CodedValueDomain;

  @property()
  @renderable()
  private _feature!: esri.Graphic | null;

  @property()
  private _featureInfo: tsx.JSX.Element | null = null;

  @property()
  private _highlight!: esri.Handle;

  constructor(properties?: WaterMetersProperties) {
    super(properties);
    whenOnce(this, 'layer.loaded', this._init.bind(this));
  }

  /**
   * initialize props and widget
   */
  private _init(): void {
    const { view, layer } = this;

    // zoom to and setup layer props
    layer
      .queryExtent({
        where: ' 1 = 1',
        outSpatialReference: {
          wkid: 3857,
        },
      })
      .then((extent: esri.Extent) => {
        view.goTo(extent).then(() => {
          if (view.scale > 20000) view.scale = 20000;
        });
      });
    layer.popupEnabled = false;
    layer.outFields = ['*'];

    // get account type domain
    this._accountDomain = layer.getFieldDomain('ACCT_TYPE') as esri.CodedValueDomain;

    // get layer view
    view.whenLayerView(layer).then((laverView: esri.FeatureLayerView): void => {
      this._layerView = laverView;
    });

    // click hit test
    view.on('click', (point: esri.ScreenPoint): void => {
      view.hitTest(point).then(this._hitTest.bind(this));
    });

    // init search
    this._searchViewModel = new SearchViewModel({
      includeDefaultSources: false,
      sources: [
        {
          layer,
          searchFields: ['WSC_ID', 'ADDRESS'],
          outFields: ['*'],
          maxSuggestions: 6,
          suggestionTemplate: '{WSC_ID} - {ADDRESS}',
        },
      ],
    });
  }

  /**
   * hit test callback
   * @param response 
   * @returns 
   */
  private _hitTest(response: esri.HitTestResult): void {
    const { layer, _layerView } = this;
    const { results } = response;

    this._clearFeature();

    if (!results.length) return;

    const filter = results.filter((value: esri.HitTestResultResults) => {
      return value.graphic.layer === layer;
    });

    if (filter[0] && filter[0].graphic) {
      this._feature = filter[0].graphic;
      this._highlight = _layerView.highlight(this._feature);
      this._createFeatureInfo();
    }
  }

  @property()
  @renderable()
  private _searchResponse!: esri.SuggestResponse;

  @property()
  private _controller: AbortController | null = null;

  private _cancelSearch(): void {
    const { _controller } = this;
    if (_controller) {
      _controller.abort();
      this._controller = null;
    }
  }

  private _search(evt: Event): void {
    this._cancelSearch();

    const target = evt.target as HTMLInputElement;
    const { value } = target;
    const { layer, _searchViewModel } = this;

    const controller = new AbortController();
    const { signal } = controller;

    this._controller = controller;

    // @ts-ignore
    _searchViewModel.suggest(value, null, { signal })
      .then((suggestResponse: esri.SuggestResponse) => {
        if (this._controller !== controller) {
          return;
        }
        this._controller = null;

        // console.log(suggestResponse);

        this._searchResponse = suggestResponse;
      })
      .catch(() => {
        if (this._controller !== controller) {
          return;
        }
        this._controller = null;
      });
  }

  private _clearFeature(): void {
    const { _feature, _featureInfo, _highlight } = this;
    if (_highlight) _highlight.remove();
    if (_feature) this._feature = null;
    if (_featureInfo) this._featureInfo = null;
  }

  render(): tsx.JSX.Element {
    const { layer, _feature } = this;
    return (
      <div class={CSS.base}>
        <calcite-tabs layout="center">
          <calcite-tab-nav slot="tab-nav">
            <calcite-tab-title active="">Meter</calcite-tab-title>
            <calcite-tab-title>Visualization</calcite-tab-title>
            <calcite-tab-title>Labels</calcite-tab-title>
          </calcite-tab-nav>
          <calcite-tab active="">{_feature ? this._featureInfo : this._renderSearch()}</calcite-tab>
          <calcite-tab>Change how the layer looks.....</calcite-tab>
          <calcite-tab>{this._renderLabeling()}</calcite-tab>
        </calcite-tabs>
      </div>
    );
  }

  private _renderSearch(): tsx.JSX.Element {
    return (
      <div>
        <small>Search by service id or address, or select a meter in the map.</small>
        <calcite-input
          scale="s"
          placeholder="Service id or address"
          oninput={this._search.bind(this)}
        ></calcite-input>
        {
          this._renderSearchResult()
        }
      </div>
    );
  }

  private _renderSearchResult(): tsx.JSX.Element | null {
    const { _searchResponse } = this;

    if (!_searchResponse || !_searchResponse.numResults) return null;

    const items = _searchResponse.results[0].results.map((result: esri.SuggestResult) => {
      return (
        <li key={KEY++}>{result.text}</li>
      );
    });

    return (<ul key={KEY++}>{items}</ul>);
  }



  private _createFeatureInfo(): void {
    const { _accountDomain } = this;
    const feature = this._feature as esri.Graphic;
    const { attributes } = feature;

    const acct_type = _accountDomain.codedValues.filter((codedValue: any) => {
      return codedValue.code === attributes.ACCT_TYPE;
    });

    this._featureInfo = (
      <div key={KEY++} class={CSS.info}>
        <div class={CSS.heading}>
          {attributes.WSC_ID} - {attributes.ADDRESS || 'No Address'}
        </div>
        <table class="esri-widget__table">
          <tr>
            <th class="esri-feature__field-header">Account Type</th>
            <td class="esri-feature__field-data">{acct_type[0].name}</td>
          </tr>
          <tr>
            <th class="esri-feature__field-header">Service Type</th>
            <td class="esri-feature__field-data">{attributes.WSC_TYPE}</td>
          </tr>
          <tr>
            <th class="esri-feature__field-header">Meter Size</th>
            <td class="esri-feature__field-data">{attributes.METER_SIZE_T}"</td>
          </tr>
          <tr>
            <th class="esri-feature__field-header">Meter S/N:</th>
            <td class="esri-feature__field-data">{attributes.METER_SN}</td>
          </tr>
          {attributes.METER_REG_SN ? (
            <tr>
              <th class="esri-feature__field-header">Meter Register No.</th>
              <td class="esri-feature__field-data">{attributes.METER_REG_SN}</td>
            </tr>
          ) : null}
          <tr>
            <th class="esri-feature__field-header">Meter Age</th>
            <td class="esri-feature__field-data">{attributes.METER_AGE} years</td>
          </tr>
        </table>
        <calcite-button scale="s" icon-start="x" onclick={this._clearFeature.bind(this)}>
          Clear
        </calcite-button>
      </div>
    );
  }

  private _renderLabeling(): tsx.JSX.Element {
    const { layer } = this;
    return (
      <div>
        <calcite-label>
          Show Labels
          <calcite-switch
            scale="s"
            switched={layer.labelsVisible}
            bind={this}
            afterCreate={(labelSwitch: HTMLCalciteSwitchElement) => {
              labelSwitch.addEventListener('calciteSwitchChange', (evt: any) => {
                layer.labelsVisible = evt.detail.switched;
              });
            }}
          ></calcite-switch>
        </calcite-label>

        <calcite-label>
          Label
          <calcite-select
            scale="s"
            bind={this}
            afterCreate={(labelSelect: HTMLCalciteSelectElement) => {
              labelSelect.addEventListener('calciteSelectChange', (evt: any) => {
                const value = evt.target.selectedOption.value;
                const labelClass = layer.labelingInfo[0].clone();
                labelClass.labelExpressionInfo.expression = `if ("${value}" == "METER_REG_SN" && $feature.${value} == null) { return "Non-radio" } else { return $feature.${value} }`;
                layer.labelingInfo = [labelClass];
                if (!layer.labelsVisible) layer.labelsVisible = true;
              });
            }}
          >
            <calcite-option value="WSC_ID">Service Id</calcite-option>
            <calcite-option value="ADDRESS">Address</calcite-option>
            <calcite-option value="METER_SN">Serial No.</calcite-option>
            <calcite-option value="METER_REG_SN">Register No.</calcite-option>
            <calcite-option value="METER_SIZE_T">Meter Size</calcite-option>
          </calcite-select>
        </calcite-label>
      </div>
    );
  }
}
