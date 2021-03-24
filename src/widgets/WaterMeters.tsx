import { property, subclass } from '@arcgis/core/core/accessorSupport/decorators';
import { whenOnce } from '@arcgis/core/core/watchUtils';

import { renderable, tsx } from '@arcgis/core/widgets/support/widget';

import Widget from '@arcgis/core/widgets/Widget';

import PopupTemplate from '@arcgis/core/PopupTemplate';
import CustomContent from '@arcgis/core/popup/content/CustomContent';

import SearchViewModel from '@arcgis/core/widgets/Search/SearchViewModel';

interface WaterMetersProperties extends esri.WidgetProperties {
  view: esri.MapView;
  layer: esri.FeatureLayer;
}

interface WaterMeterInfoProperties extends esri.WidgetProperties {
  graphic: esri.Graphic;
  layer: esri.FeatureLayer;
}

const CSS = {
  base: 'cov-water-meters',

  // popup custom content
  popup: 'cov-water-meters--popup',
  table: 'cov-water-meters--popup--table',
};

let KEY = 0;

/**
 * custom popup content
 */
@subclass('WaterMeterInfo')
class WaterMeterInfo extends Widget {
  @property()
  graphic!: esri.Graphic;

  @property()
  layer!: esri.FeatureLayer;

  @property()
  private accountDomain!: esri.CodedValueDomain;

  constructor(properties?: WaterMeterInfoProperties) {
    super(properties);
    whenOnce(this, 'layer.loaded', () => {
      this.accountDomain = this.layer.getFieldDomain('ACCT_TYPE') as esri.CodedValueDomain;
    });
  }

  render(): tsx.JSX.Element {
    const { graphic, accountDomain } = this;
    const {
      attributes: { WSC_TYPE, ACCT_TYPE, METER_SIZE_T, METER_SN, METER_REG_SN, METER_AGE },
    } = graphic;

    const acctType = accountDomain.codedValues.filter((codedValue: any) => {
      return codedValue.code === ACCT_TYPE;
    })[0].name;

    return (
      <div class={CSS.popup}>
        <table class={CSS.table}>
          <tr>
            <th>Service Type</th>
            <td>{WSC_TYPE}</td>
          </tr>
          <tr>
            <th>Account Type</th>
            <td>{acctType}</td>
          </tr>
          <tr>
            <th>Meter Size</th>
            <td>{METER_SIZE_T}"</td>
          </tr>
          <tr>
            <th>Serial No.</th>
            <td>{METER_SN}</td>
          </tr>
          {METER_REG_SN ? (
            <tr>
              <th>Register No.</th>
              <td>{METER_REG_SN}</td>
            </tr>
          ) : null}
          <tr>
            <th>Meter Age</th>
            <td>{METER_AGE} years</td>
          </tr>
        </table>
      </div>
    );
  }
}

@subclass('cov.widgets.WaterMeters')
export default class WaterMeters extends Widget {
  @property()
  view!: esri.MapView | esri.SceneView;

  @property()
  @renderable(['layer.labelsVisible'])
  layer!: esri.FeatureLayer;

  @property()
  private _searchViewModel!: SearchViewModel;

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
    layer.outFields = ['*'];

    layer.popupTemplate = new PopupTemplate({
      title: '{WSC_ID} - {ADDRESS}',
      content: [
        new CustomContent({
          outFields: ['*'],
          creator: (evt: any) => {
            return new WaterMeterInfo({
              graphic: evt.graphic,
              layer,
            });
          },
        }),
      ],
    });

    // init search view model
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

  @property()
  private _controller: AbortController | null = null;

  private _cancelSuggest(): void {
    const { _controller } = this;
    if (_controller) {
      _controller.abort();
      this._controller = null;
    }
  }

  @property()
  private _suggestions: tsx.JSX.Element[] = [];

  private _suggest(value: string): void {
    this._cancelSuggest();

    if (!value) {
      this._suggestions = [];
      return;
    }

    const { _searchViewModel } = this;

    const controller = new AbortController();
    const { signal } = controller;

    this._controller = controller;

    _searchViewModel
      // @ts-ignore
      .suggest(value, null, { signal })
      .then((suggestResponse: esri.SuggestResponse) => {
        if (this._controller !== controller) {
          return;
        }
        this._controller = null;

        if (!suggestResponse.numResults) {
          return;
        }

        this._suggestions = suggestResponse.results[0].results.map((result: esri.SuggestResult) => {
          return (
            <calcite-pick-list-item
              key={KEY++}
              label={result.text}
              onclick={this._selectFeature.bind(this, result)}
            ></calcite-pick-list-item>
          );
        });
      })
      .catch(() => {
        if (this._controller !== controller) {
          return;
        }
        this._controller = null;
      });
  }

  private _selectFeature(result: esri.SuggestResult) {
    const {
      view,
      view: { popup },
      _searchViewModel,
    } = this;

    _searchViewModel.search(result).then((searchResponse: esri.SearchViewModelSearchResponse) => {
      // roll the dice this always returns a result
      const feature = searchResponse.results[0].results[0].feature;
      popup.open({
        features: [feature],
      });
      view.goTo(feature.geometry);
      view.scale = 1200;
    });
  }

  render(): tsx.JSX.Element {
    // const { layer } = this;
    return (
      <div class={CSS.base}>
        <calcite-tabs layout="center">
          <calcite-tab-nav slot="tab-nav">
            <calcite-tab-title active="">Search</calcite-tab-title>
            <calcite-tab-title>Visualize</calcite-tab-title>
            <calcite-tab-title>Labels</calcite-tab-title>
          </calcite-tab-nav>
          <calcite-tab active="">{this._renderSearch()}</calcite-tab>
          <calcite-tab>Change how the layer looks.....</calcite-tab>
          <calcite-tab>{this._renderLabeling()}</calcite-tab>
        </calcite-tabs>
      </div>
    );
  }

  private _renderSearch(): tsx.JSX.Element {
    return (
      <div>
        <calcite-value-list
          filter-enabled=""
          filter-placeholder="Search by service id or address"
          bind={this}
          oninput={(event: any) => {
            this._suggest(event.path[0].value);
          }}
        >
          {this._suggestions}
        </calcite-value-list>
      </div>
    );
  }

  /**
   * render labeling controls
   */
  private _renderLabeling(): tsx.JSX.Element {
    const { layer } = this;
    return (
      <div>
        <calcite-label scale="s">
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

        <calcite-label scale="s">
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
      </div>
    );
  }
}
