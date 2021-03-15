import esriConfig from '@arcgis/core/config';

import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';

import Basemap from '@arcgis/core/Basemap';

import Vernonia from 'cov/Vernonia';

esriConfig.portalUrl = 'https://gisportal.vernonia-or.gov/portal';

const view = new MapView({
  map: new Map({
    basemap: new Basemap({
      portalItem: {
        id: 'f36cd213cc934d2391f58f389fc9eaec',
      },
    }),
    layers: [],
  }),
  zoom: 15,
  center: [-123.185, 45.859],
  constraints: {
    rotationEnabled: false,
  },
});

const app = new Vernonia({
  view,
  title: 'Mist Drive',
  viewTitle: true,
  container: document.createElement('div'),
});

document.body.append(app.container);
