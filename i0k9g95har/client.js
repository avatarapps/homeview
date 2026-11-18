// Soome Maja – private demo (soomemaja.ee). Models built from their public floor plans.
// Lists not given here come from engine/options.js. Append-only once live (see options.js).
const SIZES_TEDER = [
  { id:'187', name:'Bruto 187,0 m² · neto 149,0 m²', short:'187', brutto:'187,0', netto:'149,0' },
  { id:'224', name:'Bruto 223,9 m² · neto 184,1 m²', short:'224', brutto:'223,9', netto:'184,1' },
  { id:'270', name:'Bruto 270,4 m² · neto 225,3 m² · garaažiga', short:'270', brutto:'270,4', netto:'225,3' },
];
export default {
  id: 'soomemaja',
  name: 'Soome Maja',
  publicUrl: 'https://homeview.secondsun.ee/i0k9g95har/',
  build: '20261114g',
  extras: [ { id:'carport', name:'Autovarjualune' }, { id:'panels', name:'Terrassi ribiseinad' } ],
  houses: [
    { id:'teder', name:'Teder', extras:['carport','panels'], sizes: SIZES_TEDER, garage:['270'],
      cam:{ '187':[27,-6.5,-25,36], '224':[30,-7,-25,40], '270':[36,-8.5,-25,48] },
      defaults:{ size:'224', facadeMat:'boards_v', facadeColor:'tormisinine', roofMat:'sindel', roofColor:'tumesinine', frame:'valge', muntins:'jah', fascia:'valge', door:'tamm', garage:'fassaad', deck:'lehis' } },
    { id:'oobik', name:'Ööbik', extras:[],
      sizes:[ { id:'129', name:'Bruto 128,7 m² · neto 101,7 m²', short:'129', brutto:'128,7', netto:'101,7' } ],
      cam:{ '129':[30,-10,-35,40] },
      defaults:{ size:'129', facadeMat:'boards_v', facadeColor:'puit', roofMat:'valts', roofColor:'must', frame:'must', muntins:'ei', fascia:'tume', door:'must', garage:'fassaad', deck:'lehis' } },
    { id:'hiireviu', name:'Hiireviu', extras:[],
      sizes:[ { id:'161', name:'Bruto 160,7 m² · neto 114,4 m²', short:'161', brutto:'160,7', netto:'114,4' } ],
      cam:{ '161':[27,-7.8,35,35,2.6] },
      defaults:{ size:'161', facadeMat:'boards_v', facadeColor:'puit', roofMat:'betoon', roofColor:'hall', frame:'must', muntins:'jah', fascia:'tume', door:'must', garage:'fassaad', deck:'lehis' } },
  ],
};
