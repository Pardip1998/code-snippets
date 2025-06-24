
import props from '../utils/props.js';
import methods from '../utils/methods.js';
 
class Change {

	static _handler(e){				
		if(props._eTarget.closest('[data-event-id="nav-visibility-control"]')) methods._handleNavVisibility();
		if(props._eTarget.dataset.eventId === 'nav-menu-item-import-input') this._inputImportChange();
	}

	static _inputImportChange(){

		const file = props._root.$id.navMenuItemImportInput.files[0];
		if(file.type != 'application/json') return;

		const fileReader = new FileReader();
		fileReader.onload = (e) => {
			try {

				// import data
				const importData = JSON.parse(e.target.result);

				// db data
				const dbData = {};
				WBTR.db.getAllObjects('layers').then((success)=>{
					dbData.layers = success;
					WBTR.db.getAllObjects('pages').then((success)=>{
						dbData.pages = success;
						WBTR.db.getKeyValueObject('options').then((success)=>{					
							dbData.options = success;
							this._mergeImportWithDatabase(importData, dbData);
						})
					})
				})

				
			} catch (error) {
				console.error('Invalid JSON File');
			}
		}

		fileReader.readAsText(file);		
	}

	static async _mergeImportWithDatabase(importData, dbData){

		const newData = {
			layers: [],
			options: {
				'font-family': {},
			},
			pages: [],
		};
		

		// Start options ---------------------------------------------------------

		// available-fonts-href
		const fontUrls = [];		
		if(importData.options['available-fonts-href']) fontUrls.push(importData.options['available-fonts-href']);
		if(dbData.options['available-fonts-href']) fontUrls.push(dbData.options['available-fonts-href']);
		if(fontUrls.length === 2) newData.options['available-fonts-href'] = this._mergeGoogleFontUrls(fontUrls);

		// font-family
		const uniqueFontFamilies = [...new Set([...Object.keys(importData.options['font-family']), ...Object.keys(dbData.options['font-family'])])];		
		uniqueFontFamilies.forEach((f)=>{
			if(dbData.options['font-family'][f]) return;
			newData.options['font-family'][f] = importData.options['font-family'][f];
		})

		WBTR.db.updateKeyValueObject(newData.options).catch((error)=>{
				console.error('Error adding options:', error);
		})

		// End options ---------------------------------------------------------


		// Start pages ---------------------------------------------------------
		
		newData.pages = importData.pages;
		const pagesId = {};
		for (const page of newData.pages) {
    try {
    		const oldIndex = page.index;
    		delete page.index;
    		const newRecord = await WBTR.db.addObject('pages', page);
      pagesId[oldIndex] = newRecord[0].index;
    } catch (error) {
      console.error('Error adding pages:', error);
    }
  }

		// End pages ---------------------------------------------------------


		// Start Layers ---------------------------------------------------------

		newData.layers = importData.layers;
		newData.layers.forEach((l)=>{
			delete l.index;
				l.pId = pagesId[l.pId];
		})

		WBTR.db.addObject('layers', newData.layers).catch((error) => {
				console.error('Error adding layers:', error);
		})

		// End Layers ---------------------------------------------------------

	}

	static _mergeGoogleFontUrls(urls) {
	  const fontSet = new Set();
	  let display = 'swap'; // Default fallback

	  urls.forEach(url => {
	    const params = new URL(url).searchParams;

	    // Collect font families
	    const families = params.getAll('family');
	    families.forEach(f => fontSet.add(f));

	    // Optional: update display param if present
	    if (params.has('display')) {
	      display = params.get('display');
	    }
	  });

	  const mergedUrl = 'https://fonts.googleapis.com/css2?' +
	    [...fontSet].map(f => `family=${encodeURIComponent(f)}`).join('&') +
	    `&display=${display}`;

	  return mergedUrl;
	}


	
}

export default Change;