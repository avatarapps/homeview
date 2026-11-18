// Our own demo house (homeview.secondsun.ee). Not a real manufacturer's model.
export default {
  id: 'demo',
  name: 'Homeview demo',
  publicUrl: 'https://homeview.secondsun.ee/',
  build: '20261114g',
  extras: [],
  houses: [
    { id:'metsamaja', name:'Maakodu', extras:[],
      sizes:[ { id:'137', name:'Bruto 136,8 m² · neto 108,0 m²', short:'137', brutto:'136,8', netto:'108,0' } ],
      cam:{ '137':[24,-7.7,-30,31,2.4] },
      defaults:{ size:'137', facadeMat:'palk', facadeColor:'meepruun', roofMat:'laast', roofColor:'laast', frame:'pruun', muntins:'jah', fascia:'fassaad', door:'tamm', garage:'fassaad', deck:'kuldne' } },
  ],
};
