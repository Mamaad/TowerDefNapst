const paths={heart:'M12 21s-7.2-4.5-9.5-8.5C.3 8.7 2.2 4 6.6 4c2.2 0 3.7 1.2 5.4 3 1.7-1.8 3.2-3 5.4-3 4.4 0 6.3 4.7 4.1 8.5C19.2 16.5 12 21 12 21Z',coin:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4 3.5 6-3.5 6-3.5-6L12 6Z',wave:'M3 14c2.3-4 4.6-4 7 0s4.7 4 7 0 3.6-4 4-4v7H3v-3Z',score:'m12 2 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 8.2l5.9-.9L12 2Z',income:'M5 17 18 4m-8 0h8v8M5 21h14',pause:'M7 5h3v14H7zm7 0h3v14h-3z',play:'m8 5 11 7-11 7V5Z',audio:'M4 10v4h4l5 4V6l-5 4H4Zm12-2c1.4 1.1 2 2.4 2 4s-.6 2.9-2 4',mute:'M4 10v4h4l5 4V6l-5 4H4Zm12-1 5 6m0-6-5 6',upgrade:'m12 3 5 6h-3v5h-4V9H7l5-6Zm-6 14h12v4H6v-4Z',sell:'M4 7h16v13H4V7Zm3-4h10v4H7V3Zm2 8h6',target:'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5m-5-1 8-8m0 0v5m0-5h-5',close:'m6 6 12 12M18 6 6 18',camera:'M12 4a8 8 0 1 0 7.4 5M19 4v5h-5M5 20v-5h5'};
export function uiIcon(name,cls=''){const body=paths[name]||paths.score;return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${body}"/></svg>`;}
export function elementIcon(id,cls=''){const shapes={fire:'<path d="M13 2c1 5-4 6-2 10 1.2-1.8 2.6-2.8 4.4-4.2C18 10 19 12.2 19 15a7 7 0 1 1-14 0c0-3.6 2-6.8 5.7-9.8-.5 3.3 1 4.5 2.1 5.3C14.6 8.6 14.8 5.5 13 2Z"/>',ice:'<path d="M12 2v20M4 6l16 12M20 6 4 18M9 5l3 2 3-2M9 19l3-2 3 2M5 10l2 2-2 2M19 10l-2 2 2 2"/>',lightning:'<path d="m13 2-8 11h6l-1 9 9-13h-6V2Z"/>',nature:'<path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16ZM5 20c2-5 6-8 11-11"/>',earth:'<path d="m12 3 8 6-3 10H7L4 9l8-6Zm0 4-4 3 2 5h4l2-5-4-3Z"/>',arcane:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm0 6-1.5 4L12 16l1.5-4L12 8Z"/>'};return `<svg class="icon element-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${shapes[id]||shapes.arcane}</svg>`;}
const towerShapes={
 'ember-spire':'<path d="M12 2 7 10l2 10h6l2-10-5-8Zm0 4 2 5-2 3-2-3 2-5Z"/>',
 'magma-forge':'<path d="M5 8h14l2 5-3 7H6l-3-7 2-5Zm4-5h6l2 5H7l2-5Zm0 10h6v4H9v-4Z"/>',
 'frost-obelisk':'<path d="m12 2 5 7-3 12h-4L7 9l5-7Zm0 4-2 5 2 6 2-6-2-5Z"/>',
 'cryo-prism':'<path d="m12 2 8 10-8 10L4 12 12 2Zm0 5-4 5 4 5 4-5-4-5Z"/>',
 'spark-coil':'<path d="M6 4h4v16H6V4Zm8 0h4v16h-4V4ZM4 8h8M12 16h8M10 12h4"/>',
 'tempest-pylon':'<path d="m12 2 4 8-2 11h-4L8 10l4-8ZM5 9h4m6 0h4M6 5l4 4m8-4-4 4"/>',
 'thorn-nest':'<path d="M12 4c-5 1-8 5-8 9 0 4 3 7 8 7s8-3 8-7c0-4-3-8-8-9Zm0 4v8m-6-5 6 3 6-3M8 6l4 5 4-5"/>',
 'bloom-sanctum':'<path d="M12 21V9m0 2C8 5 3 7 4 12c3 1 6 0 8-3m0 3c4-6 9-4 8 1-3 1-6 0-8-3m-4 11h8"/>',
 'stone-bastion':'<path d="M5 20V8l3-4h8l3 4v12H5Zm4-8h6v8H9v-8ZM7 7h2m6 0h2"/>',
 'seismic-hammer':'<path d="M5 4h14v6H5V4Zm5 6h4v11h-4V10ZM7 2v2m10-2v2"/>',
 'arcane-eye':'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>',
 'rift-weaver':'<path d="M7 4h3v16H7V4Zm7 0h3v16h-3V4Zm-2 3c4 0 6 2 6 5s-2 5-6 5-6-2-6-5 2-5 6-5Z"/>'};
export function towerIcon(id,element){return `<svg class="tower-svg" viewBox="0 0 24 24" aria-hidden="true">${towerShapes[id]||towerShapes['arcane-eye']}</svg><span class="tower-icon-aura" data-element="${element}"></span>`;}
