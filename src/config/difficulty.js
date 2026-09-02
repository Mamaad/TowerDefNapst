export const DIFFICULTIES=Object.freeze({
 normal:{id:'normal',name:'NORMAL',lives:30,gold:550,income:60,hp:1,speed:1,reward:1,eliteBias:0,description:'Courbe prévue pour découvrir les synergies.'},
 veteran:{id:'veteran',name:'VETERAN',lives:24,gold:515,income:56,hp:1.14,speed:1.045,reward:1.05,eliteBias:1,description:'Moins de marge économique et davantage de modificateurs élites.'},
 nightmare:{id:'nightmare',name:'NIGHTMARE',lives:18,gold:485,income:52,hp:1.28,speed:1.085,reward:1.1,eliteBias:2,description:'Compositions plus dures, pression économique et élites précoces.'},
});
export const getDifficulty=id=>DIFFICULTIES[id]||DIFFICULTIES.normal;
