// import esri = __esri;

// esri config and auth
import esriConfig from '@arcgis/core/config';

// loading screen
import LoadingScreen from './core/widgets/LoadingScreen';

// map, view and layers
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Basemap from '@arcgis/core/Basemap';
import BingMapsLayer from '@arcgis/core/layers/BingMapsLayer';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

// the viewer
import Viewer from './core/Viewer';

// widgets
import WaterMeters from './core/widgets/WaterMeters';

// app config and init loading screen
const title = 'Water Meters';

const loadingScreen = new LoadingScreen({
  title,
});

// config portal and auth
esriConfig.portalUrl = 'https://gisportal.vernonia-or.gov/portal';

// layers
const waterMeters = new FeatureLayer({
  portalItem: {
    id: '4cc4580f2af246a1964c394b38f648aa',
  },
  minScale: 24000,
});

// view
const view = new MapView({
  map: new Map({
    basemap: new Basemap({
      baseLayers: [
        new BingMapsLayer({
          style: 'aerial',
          key: 'Ao8BC5dsixV4B1uhNaUAK_ejjm6jtZ8G3oXQ5c5Q-WtmpORHOMklBvzqSIEXwdxe',
        }),
        new VectorTileLayer({
          portalItem: {
            id: 'f9a5da71cd61480680e456f0a3d4e1ce',
          },
        }),
      ],
      thumbnailUrl:
        'https://gisportal.vernonia-or.gov/portal/sharing/rest/content/items/b6130a13beb74026b89960fbd424021f/info/thumbnail/thumbnail1579125721359.png?f=json',
    }),
    layers: [waterMeters],
    ground: 'world-elevation',
  }),
  zoom: 15,
  center: [-123.18291178267039, 45.8616094153766],
  constraints: {
    rotationEnabled: false,
  },
  popup: {
    dockEnabled: true,
    dockOptions: {
      position: 'bottom-left',
      breakpoint: false,
    },
  },
});

new Viewer({
  view,
  title,
  includeHeader: false,
});

view.when(() => {
  view.ui.add(
    new WaterMeters({
      view,
      waterMeters,
      printServiceUrl:
        'https://gisportal.vernonia-or.gov/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task',
    }),
    'top-right',
  );

  loadingScreen.end();
});
