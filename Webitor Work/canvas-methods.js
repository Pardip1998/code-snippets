import props from './props.js';


const Index = {
    _rectCalculate() {
        props._shadowRootRect = props._root.getBoundingClientRect(); // why this need to update every time, it always static
        props._pagesRect = props._root.$id.pages.getBoundingClientRect();
    },

    _canvasContentSetup() {
        // let activePageId = window.location.href.indexOf('?pid=');	-- remove these 2 lines and i think we dont need props._activePageId because we draw canvas as whole	-- DRY
        // activePageId = (activePageId == '-1' ? WBTR.pageManagement._props._activePageId : window.location.href.split('?pid=')[1]);						
        this._drawCanvasHTMLAndCSS();
        if (props._deleterLayersIndex.length) this._deleteDisplayNoneLayers();
    },

    // this function call only once when page load, also if layers length 10000 in canvas than do something because canvas layers and sidebat layers become 50000 (10000 + 10000*5)
    _drawCanvasHTMLAndCSS(pId) {

        const sidebarLayerHTMLTemplate = WBTR.layerSidebarLayers._methods._getLayerHTMLTemplate();
        const pagesData = {
            fullCSS: '',
            sidebarLayerStr: '',
        };

        // create page wise variables	
        WBTR.data.pages.forEach((p) => {
            pagesData['html' + p.index] = '';
            pagesData['svg' + p.index] = '';
        })

        // Canvas
        const options = WBTR.data.options;
        pagesData.fullCSS += ':host {';
        for (let o in options) {
            if (o.indexOf('canvas-') == 0) pagesData.fullCSS += `${o.replace('canvas-', '')}: ${options[o]};`;
        }
        pagesData.fullCSS += '}';


        // Layers
        WBTR.data.layers.forEach((l, i) => {

            // delete layer collect
            if (l.display === "none") {
                props._deleterLayersIndex.push(l.index);
                return false;
            }


            // SVG			
            if (['line', 'rect', 'circle', 'ellipse', 'path'].includes(l.nodeName)) {
                pagesData['html' + l.pId] += `
					<svg viewBox="${l.sviewBox}" data-trian-move="true" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:${l['stop']};left:${l['sleft']};width:${l['swidth']};height:${l['sheight']};z-index:${l['z-index']};">
						<${l.nodeName} class="canvas-layer" data-layer="${l.index}" ${l.attributes}></${l.nodeName}>
					</svg>
				`;
                pagesData.fullCSS += `[data-laye_getLayerHTMLTemplater="${l.index}"]{`;
            } else {

                // HTML	
                pagesData['html' + l.pId] += `<${l.nodeName} data-trian-move="true" class="canvas-layer" data-layer="${l.index}" style="z-index:${l['z-index']};">
					${l.innerText || ''/*? l.innerText.replaceAll('<','&lt').replaceAll('>', '&gt') : ''*/}
					${l.nodeName==='IFRAMEWRAP'?`<iframe src="${l.src}"></iframe>`:''}
				</${l.nodeName}>`;
                pagesData.fullCSS += `[data-layer="${l.index}"]{`;
            }


            // css
            for (const [prop, valu] of Object.entries(l)) {
                // do something - this area much consume memory & processor
                if (['nodeName', 'index', 'pId', 'attributes', 'stop', 'sleft', 'swidth', 'sheight', 'src', 'innerText'].includes(prop)) continue;
                pagesData.fullCSS += `${prop}:${valu};`; // do something - here warning generate 'Error in parsing value for ‘top’.  Declaration dropped.'
            }
            pagesData.fullCSS += '}';

            pagesData.sidebarLayerStr += sidebarLayerHTMLTemplate.replace('@@layer--index@@', l.index)
                .replace('@@layer--visibility@@', l.visibility)
                .replace('@@visibility--title@@', (l.visibility == 'visible' ? 'Hide' : 'Show'))
                .replace('@@layer--tagname@@', l.nodeName)
                .replace('@@layer--order@@', (l['z-index']))
                .replace('@@layer--icon@@', l.nodeName.toLowerCase());
        })

        // Pages
        WBTR.data.pages.forEach((p) => {
            // HTML			
            props._root.$id['page' + p.index].innerHTML = pagesData['html' + p.index];

            // create page svg & add its shapes
            const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgEl.classList.add('svg-canvas-layers')
            svgEl.innerHTML = pagesData['svg' + p.index];

            // add page svg and store its reference
            props._root.$id['page' + p.index].appendChild(svgEl);
            props._root.$id['page' + p.index + 'svg'] = svgEl;

            // page css
            pagesData.fullCSS += `[data-page="${p.index}"]{`;
            for (let pProp in p) {
                if (['name', 'index'].includes(pProp)) continue;
                pagesData.fullCSS += `${pProp}:${p[pProp]};`;
            }
            pagesData.fullCSS += '}';
        })

        props._root.$id.style.innerHTML = pagesData.fullCSS;

        WBTR.layerSidebarLayers._methods._showLayerHTMLTemplate(pagesData.sidebarLayerStr);
    },

    _magnifyingTransform() {
        props._magnifScale = +((props._magnifScale).toFixed(2));
        props._root.$id.pages.style.transform = `translate(${props._magnifpX}px, ${props._magnifpY}px) scale(${props._magnifScale})`;
        requestAnimationFrame(this._rectCalculate);
    },

    _canvasZoomLevelOnLoad() {
        for (let i = 0; i < 50; i++) {
            const layersElWidth = parseInt((props._magnifScale * props._root.$id.pages.offsetWidth) / 1);

            if (props._shadowRootRect.width < layersElWidth + 100) {
                props._magnifScale = props._magnifScale /= 1.2;
                props._root.$id.pages.style.transform = `translate(${props._magnifpX}px,${props._magnifpY}px) scale(${props._magnifScale})`;

                props._magnifpX = parseInt((props._shadowRootRect.width - layersElWidth + 135) / 2);
                props._magnifpY = 70;
                props._root.$id.pages.style.transform = `translate(${props._magnifpX}px,${props._magnifpY}px) scale(${props._magnifScale})`;
            }
        }
    },

    _setCSSRulesToLayerByIndex(index, styles) {
        const indexEl = props._root.shadowRoot.querySelector(`[data-layer="${index}"]`)
        for (let prop in styles) {
            indexEl.style[prop] = styles[prop];
        }
    },

    // to update css of active layer use this
    _setActiveLayerStyles(cssRules) {
        for (const [prop, valu] of Object.entries(cssRules)) {
            props._actvtag.style[prop] = valu;
        }
    },

    // clean database - remove deleted layer from DB
    _deleteDisplayNoneLayers() {
        WBTR.db.deleteObject('layers', props._deleterLayersIndex).then((success) => {
            console.log(success);
        }).catch((error) => {
            console.log(error);
        })
    },

    // update form fields based on active target - layer, canvas, page
    _updateFormFieldsOfCurrentTarget() {
        if (props._currentTargetId == 'layer') {
            this._updateFormFieldsOfActiveLayerStyle(props._currentTargetCSSRules);
            this._updateFormFieldsOfActiveLayerAttrs();
        } else if (props._currentTargetId == 'page') {
            this._updateFormFieldsOfActivePageStyle(props._currentTargetCSSRules);
        } else {
            this._updateFormFieldsOfCanvasStyle(props._currentTargetCSSRules);
        }

        if (props._currentTargetId !== 'canvas') WBTR.createGradientPopover._methods._callComponentMethods(['_canvasCurrentTargetToGradientUI']);

    },

    // active layer style to form fields
    _updateFormFieldsOfActiveLayerStyle(cssRules = {}) {
        const cssProps = {};

        if (cssRules instanceof CSSStyleDeclaration) {

            // construct css props for props input
            const bgColor = props._currentTarget.closest('svg') ? cssRules['fill'] : cssRules['background-color'];
            cssProps.backgroundColor = WBTR.colorPickerPopover._methods._rgbaStringToHexa(bgColor);
            cssProps.width = cssRules.width.replace('px', '');
            cssProps.height = cssRules.height.replace('px', '');
            cssProps.borderWidth = cssRules['border-top-width'].replace('px', '');
            cssProps.borderStyle = cssRules['border-top-style'];
            cssProps.borderColor = WBTR.colorPickerPopover._methods._rgbaStringToHexa(cssRules['border-top-color']);
            cssProps.color = WBTR.colorPickerPopover._methods._rgbaStringToHexa(cssRules['color']);
            cssProps.fontSize = cssRules['font-size'];

        } else {
            Object.assign(cssProps, cssRules);
        }


        for (let component in WBTR) {
            if (!WBTR[component].dataset?.customElement) continue;
            for (let prop in WBTR[component].$propElements) {
                if (typeof cssProps[prop] === 'undefined') continue;
                WBTR[component].$propElements[prop].value = (cssProps[prop] + '').replace('px', '').split('.')[0];
            }
        }

        // update CSS variable
        if (cssProps.backgroundColor) document.documentElement.style.setProperty('--canvas--target--background-color', cssProps.backgroundColor);
        if (cssProps.color) document.documentElement.style.setProperty('--canvas--target--color', cssProps.color);
        if (cssProps.borderColor) document.documentElement.style.setProperty('--canvas--target--border-color', cssProps.borderColor);

    },

    // active layer non-props ( attributes ) to form fields
    _updateFormFieldsOfActiveLayerAttrs() {
        if ('innerText' in props._currentTarget) WBTR.designSidebarDesigns.$id.tagInnerhtml.value = props._currentTarget.innerText;
        if ('src' in props._currentTarget) WBTR.designSidebarDesigns.$id.tagSrc.value = props._currentTarget.src;
    },

    // active page style to form fields
    _updateFormFieldsOfActivePageStyle(cssRules) {
        const cssProps = {};

        if (cssRules instanceof CSSStyleDeclaration) {
            // css property	
            const bgColor = cssRules['background-color'];
            const color = cssRules['color'];
            cssProps.backgroundColor = WBTR.colorPickerPopover._methods._rgbaStringToHexa(bgColor);
            cssProps.color = WBTR.colorPickerPopover._methods._rgbaStringToHexa(color);
            cssProps.width = cssRules.width.replace('px', '');
            cssProps.height = cssRules.height.replace('px', '');
        } else {
            Object.assign(cssProps, cssRules);
        }

        for (let component in WBTR) {
            if (!WBTR[component].dataset?.customElement) continue;
            for (let prop in WBTR[component].$propElements) {
                if (typeof cssProps[prop] === 'undefined') continue;
                WBTR[component].$propElements[prop].value = (cssProps[prop] + '').replace('px', '').split('.')[0];
            }
        }
        // update CSS variable
        if (cssProps.backgroundColor) document.documentElement.style.setProperty('--canvas--target--background-color', cssProps.backgroundColor);
        if (cssProps.color) document.documentElement.style.setProperty('--canvas--target--color', cssProps.color);
    },

    // canvas style to form fields
    _updateFormFieldsOfCanvasStyle(cssRules) {
        // this area can be more optimize --- DRY
        const cssProps = {};

        if (cssRules instanceof CSSStyleDeclaration) {
            // css property	
            const bgColor = cssRules['background-color'];
            const color = cssRules['color'];
            cssProps.backgroundColor = WBTR.colorPickerPopover._methods._rgbaStringToHexa(bgColor);
            cssProps.color = WBTR.colorPickerPopover._methods._rgbaStringToHexa(color);

        } else {
            Object.assign(cssProps, cssRules);
        }


        for (let component in WBTR) {
            if (!WBTR[component].dataset?.customElement) continue;
            for (let prop in WBTR[component].$propElements) {
                if (typeof cssProps[prop] === 'undefined') continue;
                WBTR[component].$propElements[prop].value = (cssProps[prop] + '').replace('px', '').split('.')[0];
            }
        }

        // update CSS variable
        if (cssProps.backgroundColor) document.documentElement.style.setProperty('--canvas--target--background-color', cssProps.backgroundColor);
        if (cssProps.color) document.documentElement.style.setProperty('--canvas--target--color', cssProps.color);
    },

    // save canvas current target (layer,page,canvas) style to indexedDB
    _saveCanvasCurrentTargetToIndexedDB(element) {

        // Store target & its styles
        const tEl = element || props._currentTarget;
        const styles = {
            nodeName: tEl.nodeName
        };

        // src
        if (tEl.src) styles.src = tEl.src;

        // innerHTML
        if (tEl.innerText?.trim().length) styles.innerText = tEl.innerText.replaceAll(' ', '&nbsp;');

        tEl.getAttribute('style')?.split(';').forEach((cssRule) => {
            if (!cssRule?.trim()) return;
            const [prop, valu] = cssRule.split(':');
            styles[prop.trim()] = valu.trim();
        })

        if (Object.keys(styles).length == 0) return false;

        // Layer
        if (tEl.matches('[data-layer]')) {
            WBTR.db.updateObject('layers', tEl.dataset.layer, styles).catch((error) => {
                console.log(error);
            })
            return;
        }

        // page    
        if (tEl.matches('[data-page]')) {
            const pagesTableIndex = (+tEl.dataset.page) - 1;
            Object.assign(WBTR.data.pages[pagesTableIndex], styles);
            WBTR.db.updateObject('pages', tEl.dataset.page, WBTR.data.pages[pagesTableIndex]).catch((error) => {
                console.log(error);
            })
            return;
        }

        // canvas
        const canvasStyle = {};
        for (let prop in styles) {
            canvasStyle['canvas-' + prop] = styles[prop];
        }
        if (tEl.closest('[data-id="pages"]') || tEl.dataset.customElement == 'canvas') {
            WBTR.db.updateKeyValueObject(canvasStyle).catch((error) => {
                console.log(error);
            })
        }
    },

    // prop form field value to current target
    _inputToCanvasCurrentTarget() {
        const iEl = WBTR.eventTarget;
        const prop = iEl.dataset.prop;
        const valu = iEl.dataset.value || iEl.value;
        const unit = iEl.dataset.propUnit || '';

        // for(let component in WBTR){		
        // 	if(!WBTR[component].dataset?.customElement) continue;
        // 	// if(WBTR[component].$propElements[prop]) WBTR[component].$propElements[prop].value = inputEl.value; -- same input set value same is useless or infinite execution
        // 	if(WBTR[component].dataset.customElement === 'canvas') WBTR.canvas._props.activeLayer.style[prop] = inputEl.value+inputEl.dataset.propUnit;
        // }		
        props._currentTarget.style[prop] = valu + unit;
    },

    _createPages(page) {
        const pages = page ? [page] : WBTR.data.pages;

        pages.forEach((p) => {
            const divEl = document.createElement('div');
            divEl.classList.add('page');
            divEl.setAttribute('data-name', p.name);
            divEl.setAttribute('data-class', 'page');
            divEl.setAttribute('data-page', p.index);
            divEl.setAttribute('data-common-closest', 'page');
            props._root.$id.pages.insertAdjacentElement('beforeend', divEl);
            props._root.$id['page' + p.index] = divEl;

            // page name
            const spanEl = document.createElement('span');
            spanEl.classList.add('page-name');
            spanEl.setAttribute('data-page-id', p.index);
            spanEl.innerText = p.name;
            props._root.$id['pageName' + p.index] = spanEl;
            props._root.$id.pageNames.appendChild(spanEl);

            if (page) {
                divEl.style.cssText = `width: ${p.width};height: ${p.height}; background-color: ${p['background-color']}`;
            }
        });
    },

    _removeContentEditableFromLayer() {
        const els = props._root.shadowRoot.querySelectorAll('[contenteditable="true"]');
        els.forEach((el) => {
            el.removeAttribute('contenteditable');
        })
    },

    // design sidebar control based on layer, page, canvas
    _uiBasedOnCanvasCurrentTarget() {
        WBTR.designSidebarDesigns.$id.wrapper.setAttribute('data-canvas-current-target', props._currentTargetId);
        WBTR.popovers.setAttribute('data-canvas-current-target', props._currentTargetId);

        // // layer
        // if (props._currentTargetId == 'layer') {
        // 	return;
        // }

        // // page
        // if (props._currentTargetId == 'page') {
        // 	return;
        // }

        // // canvas
        // if (props._currentTargetId == 'canvas') {
        // 	return;
        // }

    },

    _pagenamePositionManage() {
        if (!props._isTransitioning) return;

        [...props._root.$id.pages.children].forEach((p) => {
            const index = p.dataset.page;
            const pagesRect = WBTR.element.getRect(p);
            const pnEl = props._root.$id['pageName' + index];
            pnEl.style.left = (pagesRect.x - WBTR.layerSidebar.offsetWidth) + 'px';
            pnEl.style.top = (pagesRect.y - (pnEl.offsetHeight) - 2) + 'px';
            pnEl.style.maxWidth = pagesRect.width + 'px';
        })

        requestAnimationFrame(Index._pagenamePositionManage);
    },

    _pathCreatedSuccessFully() {
        if (props._actvtag?.nodeName == 'path') {
            const pathRect = WBTR.element.getSvgRect(props._actvtag);
            WBTR.canvas.$id.canvasCreatePathFirstpoint.classList.remove('show');
            if (pathRect.width < 1 && pathRect.height < 1) {
                props._actvtag.remove();
                return;
            }
            props._pathPoints.push(props._pathPoints[0] + ' Z');
            props._actvtag.setAttribute('d', 'M ' + props._pathPoints.join(' '));

            const svgData = this._createSvgWrapper();
            svgData.attributes = this._getSvgShapeAttributes(props._actvtag);
            WBTR.db.updateObject('layers', props._actvtag.dataset.layer, svgData).catch((error) => {
                console.log(error);
            })

        }
    },

    _createSvgWrapper() {
        const aRect = WBTR.element.getSvgRect(props._actvtag);
        const sviewBox = `${aRect.x} ${aRect.y} ${aRect.width} ${aRect.height}`;
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgEl.setAttribute('viewBox', sviewBox);
        svgEl.setAttribute('data-trian-move', true);
        svgEl.style.cssText = `position:absolute;top:${aRect.y}px;left:${aRect.x}px;width:${aRect.width}px;height:${aRect.height}px;`;
        props._actvtag.closest('[data-page]').appendChild(svgEl);
        svgEl.appendChild(props._actvtag);

        return {
            'stop': aRect.y + 'px',
            'sleft': aRect.x + 'px',
            'swidth': aRect.width + 'px',
            'sheight': aRect.height + 'px',
            sviewBox,
        };
    },

    _getSvgShapeAttributes(element, skipAttrs = ['class', 'data-layer']) {
        const attributeString = Array.from(props._actvtag.attributes).map((attr) => {
            if (!skipAttrs.includes(attr.name)) return `${attr.name}="${attr.value}"`;
        }).join(' ');
        return attributeString;
    },

    _switchActiveLayerTag() {
        const selectedTag = WBTR.designSidebarDesigns.$id.switchtag.value;
        const tagEl = document.createElement(selectedTag);
        for (const attr of props._currentTarget.attributes) {
            tagEl.setAttribute(attr.name, attr.value);
        }
        props._currentTarget.insertAdjacentElement('afterend', tagEl);
        props._currentTarget.remove();
        props._currentTarget = tagEl;
        this._saveCanvasCurrentTargetToIndexedDB();
    },

    _updateCurrentTargetInnerHTML() {
        props._currentTarget.innerText = WBTR.designSidebarDesigns.$id.tagInnerhtml.value;
        this._saveCanvasCurrentTargetToIndexedDB();
    },

    _updateCurrentTargetSrc() {
        console.log(WBTR.designSidebarDesigns.$id.tagSrc.value);
        const inputSrc = new URL(WBTR.designSidebarDesigns.$id.tagSrc.value);
        const hostname = inputSrc.hostname;
        let src = inputSrc;

        // start youtube
        const validYouTubeHosts = [
            "youtube.com",
            "www.youtube.com",
            "youtu.be",
            "m.youtube.com",
            "music.youtube.com",
            "www.youtube-nocookie.com"
        ];
        if (validYouTubeHosts.includes(hostname)) {
            src = this._getYouTubeEmbedUrl(inputSrc);
        }
        // end youtube

        if (props._currentTarget.nodeName === 'IFRAMEWRAP') {
            props._currentTarget.src = src;
            props._currentTarget.firstElementChild.src = src;
        } else {
            props._currentTarget.src = src;
        }

        this._saveCanvasCurrentTargetToIndexedDB();
    },

    _getYouTubeEmbedUrl(url) {
        try {
            const parsedUrl = new URL(url);
            let videoId = "";

            if (parsedUrl.hostname === "youtu.be") {
                // Short link: https://youtu.be/VIDEO_ID
                videoId = parsedUrl.pathname.slice(1);
            } else if (
                parsedUrl.hostname.includes("youtube.com")
            ) {
                if (parsedUrl.pathname === "/watch") {
                    // Standard URL: https://www.youtube.com/watch?v=VIDEO_ID
                    videoId = parsedUrl.searchParams.get("v");
                } else if (parsedUrl.pathname.startsWith("/embed/")) {
                    // Already in embed format
                    return url;
                } else if (parsedUrl.pathname.startsWith("/shorts/")) {
                    // Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
                    videoId = parsedUrl.pathname.split("/")[2];
                }
            }

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        } catch (e) {
            // Invalid URL
            return url;
        }

        return null;
    },

    _getZIndexOfNewCreatedLayer() {
        if (WBTR.data.layers.length === 0) return 1000;
        return +(WBTR.data.layers.at(-1)['z-index']) + 1000;
    },

    _showLayerHoverIndicator(eTarget) {
        const tId = eTarget.closest('[data-layer]')?.dataset.layer;
        if (!tId) return;
        const t = props._root.shadowRoot.querySelector(`[data-layer="${tId}"]`);
        const tRect = t.getBoundingClientRect();
        const leftP = tRect.x - props._shadowRootRect.x + WBTR.canvas.scrollLeft;
        const topP = tRect.y - props._shadowRootRect.y + WBTR.canvas.scrollTop;
        props._root.$id.lhoveriHtmlDiv.style = `left: ${leftP}px;top:${topP}px;width:${tRect.width}px;height:${tRect.height}px;opacity:1;`;

    },

    // left, top, left + width, top + height

    _highlightElementsInSelection(selectionAreaEl) {
        props._selectionAreaElements.forEach(el => el.classList.remove('selected'));
        props._selectionAreaElements = [];

        props._root.shadowRoot.querySelectorAll('[data-layer]').forEach(el => {

        				const rectEl = el.getBoundingClientRect();
        				const selectionAreaElRect = selectionAreaEl.getBoundingClientRect();
          
            if (
                rectEl.right >= selectionAreaElRect.left &&
                rectEl.left <= selectionAreaElRect.left + selectionAreaElRect.width &&
                rectEl.bottom >= selectionAreaElRect.top &&
                rectEl.top <= selectionAreaElRect.top + selectionAreaElRect.height
            ) {
                el.classList.add('selected');
                props._selectionAreaElements.push(el);
            }
        });
    }
}

export default Index;