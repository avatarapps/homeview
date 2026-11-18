// Finnlog – private demo (finnlog.ee). Models built from their public floor plans and elevations.
// Lists not given here come from engine/options.js. Append-only once live (see options.js).
export default {
  id: 'finnlog',
  name: 'Finnlog',
  publicUrl: 'https://homeview.secondsun.ee/v22afzyw8l/',
  build: '20261118a',
  extras: [],
  hidden: ['garage'],
  houses: [
    { id:'modi', name:'Modi', extras:[],
      sizes:[ { id:'170', name:'Kogupind 170,0 m² · põrandapind 145,0 m²', short:'170', brutto:'170,0', netto:'145,0' } ],
      cam:{ '170':[30,-9,-35,40,3] },
      defaults:{ size:'170', facadeMat:'boards_v', facadeColor:'sysimust', roofMat:'valts', roofColor:'must', frame:'must', muntins:'ei', fascia:'valge', door:'must', garage:'fassaad', deck:'lehis' } },
    { id:'thetis', name:'Thetis', extras:[],
      sizes:[ { id:'353', name:'Kogupind 352,5 m² · põrandapind 220,1 m²', short:'353', brutto:'352,5', netto:'220,1' } ],
      cam:{ '353':[54,-12,-28,106,2] },
      defaults:{ size:'353', facadeMat:'boards_v', facadeColor:'grafiit', roofMat:'betoon', roofColor:'grafiit', frame:'must', muntins:'ei', fascia:'tume', door:'must', garage:'fassaad', deck:'hallpuit' } },
    { id:'juno', name:'Juno', extras:[],
      sizes:[ { id:'255', name:'Kogupind 255,2 m² · põrandapind 187,5 m²', short:'255', brutto:'255,2', netto:'187,5' } ],
      cam:{ '255':[36,-8,-30,48,3] },
      defaults:{ size:'255', facadeMat:'palk', facadeColor:'meepruun', roofMat:'betoon', roofColor:'tumehall', frame:'pruun', muntins:'ei', fascia:'fassaad', door:'tamm', garage:'fassaad', deck:'lehis' } },
  ],
};
