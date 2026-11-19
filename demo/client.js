// Homeview's own demo houses (homeview.secondsun.ee). Original designs, not a manufacturer's models.
// metsamaja137 files stay in this folder: iOS app 1.0 opens them directly.
export default {
  id: 'demo',
  name: 'Homeview demo',
  publicUrl: 'https://homeview.secondsun.ee/',
  build: '20261119g',
  extras: [],
  houses: [
    { id:'sume', name:'Sume', extras:[],
      sizes:[ { id:'162', name:'Bruto 162,0 m² · neto 139,5 m²', short:'162', brutto:'162,0', netto:'139,5' } ],
      cam:{ '162':[33,-10.9,-28,44,2.4] },
      defaults:{ size:'162', facadeMat:'boards_v', facadeColor:'puit', roofMat:'valts', roofColor:'must', frame:'must', muntins:'ei', fascia:'tume', door:'must', garage:'fassaad', deck:'lehis' } },
    { id:'kuma', name:'Kuma', extras:[],
      sizes:[ { id:'144', name:'Bruto 144,0 m² · neto 124,0 m²', short:'144', brutto:'144,0', netto:'124,0' } ],
      cam:{ '144':[32,-12.2,-25,43,2.4] },
      defaults:{ size:'144', facadeMat:'boards_v', facadeColor:'sinihall', roofMat:'valts', roofColor:'grafiit', frame:'must', muntins:'ei', fascia:'tume', door:'must', garage:'fassaad', deck:'lehis' } },
    { id:'sade', name:'Säde', extras:[],
      sizes:[ { id:'118', name:'Bruto 117,6 m² · neto 101,0 m²', short:'118', brutto:'117,6', netto:'101,0' } ],
      cam:{ '118':[29,-10.4,-30,39,2.8] },
      defaults:{ size:'118', facadeMat:'boards_v', facadeColor:'punamuld', roofMat:'valts', roofColor:'must', frame:'valge', muntins:'ei', fascia:'valge', door:'valge', garage:'fassaad', deck:'lehis' } },
    { id:'hobe', name:'Hõbe', extras:[],
      sizes:[ { id:'222', name:'Bruto 222,5 m² · neto 191,0 m²', short:'222', brutto:'222,5', netto:'191,0' } ],
      cam:{ '222':[37,-11.4,-28,49,2.6] },
      defaults:{ size:'222', facadeMat:'boards_h', facadeColor:'lumivalge', roofMat:'valts', roofColor:'hobe', frame:'must', muntins:'jah', fascia:'valge', door:'tamm', garage:'fassaad', deck:'kuldne' } },
  ],
};
