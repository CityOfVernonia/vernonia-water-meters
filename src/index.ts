import esriConfig from '@arcgis/core/config';

import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';

import Basemap from '@arcgis/core/Basemap';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

import Vernonia from 'cov/Vernonia';

import WaterMeters from './widgets/WaterMeters';

esriConfig.portalUrl = 'https://gisportal.vernonia-or.gov/portal';

const waterMeters = new FeatureLayer({
  portalItem: {
    id: '4cc4580f2af246a1964c394b38f648aa',
  },
  minScale: 20000,
});

const view = new MapView({
  map: new Map({
    basemap: new Basemap({
      portalItem: {
        id: 'f36cd213cc934d2391f58f389fc9eaec',
      },
    }),
    layers: [waterMeters],
  }),
  zoom: 15,
  center: [-123.185, 45.859],
  constraints: {
    rotationEnabled: false,
  },
});

const app = new Vernonia({
  view,
  title: 'Water Meters',
  viewTitle: true,
  widgets: [
    {
      placement: 'view',
      position: 'top-right',
      widget: new WaterMeters({
        view,
        layer: waterMeters,
      }),
    },
  ],
  container: document.createElement('div'),
});

document.body.append(app.container);

console.log(view);
