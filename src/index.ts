import esriConfig from '@arcgis/core/config';

import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';

import Basemap from '@arcgis/core/Basemap';
import BingMapsLayer from '@arcgis/core/layers/BingMapsLayer';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer';
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
    }),
    layers: [waterMeters],
  }),
  zoom: 15,
  center: [-123.185, 45.859],
  constraints: {
    rotationEnabled: false,
  },
  popup: {
    dockEnabled: true,
    collapseEnabled: false,
    dockOptions: {
      position: 'bottom-left',
      breakpoint: false,
      buttonEnabled: false,
    },
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
        printServiceUrl:
          'https://gisportal.vernonia-or.gov/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task',
      }),
    },
  ],
  container: document.createElement('div'),
});

document.body.append(app.container);

console.log(view);
