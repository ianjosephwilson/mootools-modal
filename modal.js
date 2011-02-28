/*
This modal is very simplistic and provides to help for specific types of
content.

Controls
  - Controls should be added manually by having them call the hide method,
    or having them call loadContent with new content.

Ajax
  - In order to use this modal with ajax you need to create a request and 
  on success call the loadContent method.

Images
  - In order to emulate lightbox you one will need to 
*/
(function () {
    var Modal = new Class({
        Implements: [Options, Events],
        options: {
            overlayOpacity: 0.5,
            overlayZIndex: 49,
            overlayBackgroundColor: '#000000',
            overlayCssClass: null,
            panelZIndex: 50,
            panelWidth: 600,
            panelHeight: 600,
            panelBackgroundColor: '#ffffff',
            panelCssClass: null,
            // Space in the width to leave on left/right of panel.
            // - Note this isn't the sum of left and right but one
            // side only and will be mirrored.
            // - Must be integer with implicit pixel units.
            panelXOffset: 0,
            // Space in the height to leave on top/bottom of panel.
            // - Note this isn't the sum of left and right but one
            // side only and will be mirrored.
            // - Must be integer with implicit pixel units.
            panelYOffset: 0
        },
        initialize: function (options) {
            var bind = this;
            this.setOptions(options);
            this.panelEl = null;
            this.overlayEl = null;
            // True if panel and overlay are showing.
            this.showing = false;
            // True if the user customized the size.
            this.sizeCustomized = false;
            // These options are only used on one display.
            this.contentOptions = null;
            this.panelParentEvents = {
                keydown: this.panelParentKeydown.bind(this)
            };
            this.overlayEvents = {
                click: this.overlayClick.bind(this)
            };
            this.windowEvents = {
                resize: this.windowResize.bind(this),
                scroll: this.windowScroll.bind(this)
            };
        },
        attach: function () {
            /* Attach to the dom. */
            var panelParentEl = $(document.body);
            this.overlayEl = this.buildOverlay();
            this.panelEl = this.buildPanel();
            panelParentEl.adopt([this.overlayEl, this.panelEl]);
        },
        destroy: function () {
            this.hide();
            this.detachEvents();
            this.overlayEl.destroy();
            this.panelEl.destroy();
        },
        buildOverlay: function () {
            var overlayEl = new Element('div');
            overlayEl.setStyles({
                zIndex: this.options.overlayZIndex,
                margin: 0,
                padding: 0,
                position: 'absolute',
                opacity: this.options.overlayOpacity,
                backgroundColor: this.options.overlayBackgroundColor
            });
            if (this.options.overlayCssClass !== null) {
                overlayEl.addClass(this.options.overlayCssClass);
            }
            return overlayEl;
        },
        buildPanel: function () {
            var panelEl = new Element('div');
            panelEl.setStyles({
                zIndex: this.options.panelZIndex,
                margin: 0,
                padding: 0,
                position: 'absolute',
                backgroundColor: this.options.panelBackgroundColor
            });
            if (this.options.panelCssClass !== null) {
                panelEl.addClass(this.options.panelCssClass);
            }
            return panelEl;
        },
        loadContent: function (contentEl, contentOptions) {
            // TODO: We do this in hide, now quite sure we need this.
            this.panelEl.empty();
            this.panelEl.adopt(contentEl);
            this.contentOptions = contentOptions;
            if (!this.showing) {
                this.show();
            }
        },
        loadContentAutoSize: function (contentEl, contentOptions) {
            var imageUrls, onComplete, dimensions;
            imageUrls = contentEl.getElements('img').map(
                function (imageEl) {
                    return imageEl.get('src');
                });
            onComplete = (function () {
                /* Put the content in a table because it seems to be the only
                reliable way to measure the width and height with shrink
                wrapping. */
                var tdEl, trEl, tbodyEl, tableEl;
                tdEl = new Element('td').adopt(contentEl);
                trEl = new Element('tr').adopt(tdEl);
                tbodyEl = new Element('tbody').adopt(trEl);
                tableEl = new Element('table').adopt(tbodyEl);
                
                // Make sure the table is not shown.
                tableEl.setStyle('display', 'none');
                // Some styles might depend on being in a modal, so fake it.
                if (this.options.panelCssClass !== null) {
                    tableEl.addClass(this.options.panelCssClass);
                }
                $(document.body).adopt(tableEl);
                
                dimensions = tableEl.measure(function () {
                    return tableEl.getSize();
                });
                [tdEl, trEl, tbodyEl, tableEl].each(function (el) {
                    el.dispose();
                });
                contentOptions.panelWidth = dimensions.x;//width;
                contentOptions.panelHeight = dimensions.y;//height;
                this.loadContent(contentEl, contentOptions);
            }).bind(this);
            if (imageUrls.length > 0) {
                // When the images are done loading inject the clone and
                // measure it. Then render the modal with the correct
                // width/height.
                Asset.images(imageUrls, {
                    onComplete: onComplete
                });
            } else {
                onComplete();
            }
        },
        attachEvents: function () {
            var panelParentEl = $(document.body);
            panelParentEl.addEvents(this.panelParentEvents);
            this.overlayEl.addEvents(this.overlayEvents);
            window.addEvents(this.windowEvents);
        },
        detachEvents: function () {
            var panelParentEl = $(document.body);
            this.overlayEl.removeEvents(this.overlayEvents);
            panelParentEl.removeEvents(this.panelParentEvents);
            window.removeEvents(this.windowEvents);
        },
        show: function () {
            var panelParentEl;
            this.showing = true;
            this.attachEvents();
            this.overlayEl.setStyles(Object.merge(
                this.getOverlayCoords(), {
                display: 'block'
            }));
            this.panelEl.setStyles(Object.merge(
                this.getPanelCoords(), {
                display: 'block'
            }));
            this.fireEvent('panelShown');
        },
        hide: function () {
            this.showing = false;
            this.contentOptions = null;
            this.detachEvents();
            this.panelEl.setStyle('display', 'none');
            this.overlayEl.setStyle('display', 'none');
            // Clear out panel so old ids/classes aren't sitting around.
            this.panelEl.empty();
            this.fireEvent('panelHidden');
        },
        panelParentKeydown: function (e) {
            if (e.key === 'esc') {
                if (this.showing) {
                    this.hide();
                }
            }
        },
        overlayClick: function (e) {
            if (this.showing) {
                this.hide();
            }
        },
        getPanelWidth: function () {
            if (this.contentOptions !== null &&
                    this.contentOptions.hasOwnProperty('panelWidth')) {
                return this.contentOptions.panelWidth;
            } else {
                return this.options.panelWidth;
            }
        },
        getPanelHeight: function () {
            if (this.contentOptions !== null &&
                    this.contentOptions.hasOwnProperty('panelHeight')) {
                return this.contentOptions.panelHeight;
            } else {
                return this.options.panelHeight;
            }
        },
        getPanelXOffset: function () {
            if (this.contentOptions !== null &&
                    this.contentOptions.hasOwnProperty('panelXOffset')) {
                return this.contentOptions.panelXOffset;
            } else {
                return this.options.panelXOffset;
            }
        },
        getPanelYOffset: function () {
            if (this.contentOptions !== null &&
                    this.contentOptions.hasOwnProperty('panelYOffset')) {
                return this.contentOptions.panelYOffset;
            } else {
                return this.options.panelYOffset;
            }
        },
        getOverlayCoords: function () {
            var windowScrollSize, overlayCoords;
            windowScrollSize = window.getScrollSize();
            // Reposition and resize the overlay.
            overlayCoords = {
                top: 0 + 'px',
                left: 0 + 'px',
                width: windowScrollSize.x + 'px',
                height: windowScrollSize.y + 'px'
            };
            return overlayCoords;
        },
        getPanelCoords: function () {
            var windowSize, panelXMargin, panelYMargin, panelWidth,
                    panelHeight, panelCoords, panelXOffset, panelYOffset,
                    windowScroll;
            windowScroll = window.getScroll();
            windowSize = window.getSize();
            panelWidth = this.getPanelWidth();
            panelXOffset = this.getPanelXOffset();
            if (windowSize.x >= panelWidth + (panelXOffset * 2)) {
                panelXMargin = (windowSize.x - panelWidth) / 2 - panelXOffset;
            } else {
                panelXMargin = 0;
                panelWidth = windowSize.x - (panelXOffset * 2);
            }
            panelHeight = this.getPanelHeight();
            panelYOffset = this.getPanelYOffset();
            if (windowSize.y >= panelHeight + (panelYOffset * 2)) {
                panelYMargin = (windowSize.y - panelHeight) / 2 - panelYOffset;
            } else {
                panelYMargin = 0;
                panelHeight = windowSize.y - (panelYOffset * 2);
            }
            // The offsets are not included here because they lie
            // between the margin and the height/width.
            panelCoords = {
                left: panelXMargin + windowScroll.x + 'px',
                width: panelWidth + 'px',
                top: panelYMargin + windowScroll.y + 'px',
                height: panelHeight + 'px'
            };
            return panelCoords;
        },
        windowResize: function (e) {
            /* When the user resizes the window. */
            if (this.showing) {
                this.overlayEl.setStyles(this.getOverlayCoords());
                this.panelEl.setStyles(this.getPanelCoords());
            }
        },
        windowScroll: function (e) {
            /* When the user scrolls up and down in the window. */
            var targetEl;
            if (this.showing) {
                // TODO: Find a way to test if incompliant browsers
                // actually do this.  Scroll should not bubble up.
                // Only update the coords if the user
                // is not scrolling inside the modal.
                targetEl = null;
                if (typeof e !== typeof undefined) {
                    targetEl = $(e.target);
                }
                if (targetEl === null || !this.panelEl.contains(targetEl)) {
                    this.overlayEl.setStyles(this.getOverlayCoords());
                    this.panelEl.setStyles(this.getPanelCoords());
                }
            }
        }
    });

    // Until a better namespacing mechanism exists I guess this is it.
    window.Modal = Modal;
    
})();
