/*
Copyright (c) 2010, Ian Wilson

SEE LICENSE for the licensing information.

This modal is very simplistic and provides to help for specific types of
content.

Controls
  - Controls should be added manually by having them call the hide method,
    or having them call loadContent with new content.

Ajax
  - In order to use this modal with ajax you need to create a request and 
  on success call the loadContent method.

Images
  - In order to emulate lightbox a modal instance should be created and the
  loadContent method should be called when thumbnails are clicked.

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
            panelCssClass: null
        },
        initialize: function (options) {
            /* Initialize the modal's properties and options.

            Must be called before attach. */
            this.setOptions(options);
            this.panelEl = null;
            this.overlayEl = null;
            // True if panel and overlay are showing.
            this.showing = false;
            // Used to detect if 
            this.newContent = null;
            // True if the user customized the size.
            this.sizeCustomized = false;
            // These options are only used for one set of content.
            this.contentOptions = null;
            // This is the computed size and margin of the panel.
            this.computedPanelDimensions = null;
            
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
            this.ourEvents = {
                onContentChanged: this.contentChanged.bind(this)
            };
        },
        attach: function () {
            /* Attach the modal to DOM.

            Must be called before loadContent. */
            var panelParentEl = $(document.body);
            this.overlayEl = this.buildOverlay();
            this.panelEl = this.buildPanel();
            panelParentEl.adopt([this.overlayEl, this.panelEl]);
        },
        destroy: function () {
            /* Destroy this modal, it cannot be used again. */
            this.hide();
            this.detachEvents();
            this.overlayEl.destroy();
            this.panelEl.destroy();
        },
        buildOverlay: function () {
            /* Build the overlay element and set styles. */
            var overlayEl = new Element('div');
            overlayEl.setStyles({
                display: 'none',
                top: 0 + 'px',
                left: 0 + 'px',
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
            /* Build the panel element and set styles. */
            var panelEl = new Element('div');
            panelEl.setStyles({
                display: 'none',
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
            /* Load content into the modal.

            The panel size must be provided either in contentOptions with the
            panelWidth and panelHeight properties or in the options for this
            modal instance. Note that contentOptions is not optional and must
            be at minimum an empty object. */
            // Make sure we hide the modal before loading new content.
            if (this.showing) {
                this.hide();
            }
            this.contentOptions = contentOptions;
            this.panelEl.empty();
            this.panelEl.adopt(contentEl);
            this.show();
        },
        loadContentAutoSize: function (contentEl, contentOptions) {
            /* Try to compute the content size and then load content into the
            modal.

            This is just a wrapper around loadContent. */
            var self;
            // We need this in order to reposition and resize the modal.
            contentOptions.autosize = true;
            // Pass modal instance into closure.
            self = this;
            function onSizeComputed(computedSize) {
                contentOptions.panelWidth = computedSize.totalWidth;
                contentOptions.panelHeight = computedSize.totalHeight;
                self.loadContent(contentEl, contentOptions);
            }
            this.measureContentComputedSize(contentEl, onSizeComputed);
        },
        measureContentComputedSize: function (contentEl, onComplete) {
            /* Measure computed size of contentEl and call onComplete with the
            size. */
            var imageUrls;
            imageUrls = contentEl.getElements('img').map(
                function (imageEl) {
                    return imageEl.get('src');
                });
            function onSizeComplete(onComplete) {
                /* Put the content in a table because it seems to be the only
                reliable way to measure the width and height with shrink
                wrapping. The table is going to add all kinds of margins,
                padding, and border complications so I would like to use
                another way. */
                var tdEl, trEl, tbodyEl, tableEl, computedSize;
                tdEl = new Element('td').adopt(contentEl);
                trEl = new Element('tr').adopt(tdEl);
                tbodyEl = new Element('tbody').adopt(trEl);
                tableEl = new Element('table').adopt(tbodyEl);
                
                // Make sure the table is not shown.
                tableEl.setStyle('display', 'none');
                // Some styles might depend on being in the modal, so fake it.
                if (this.options.panelCssClass !== null) {
                    tableEl.addClass(this.options.panelCssClass);
                }
                $(document.body).adopt(tableEl);
                
                computedSize = tableEl.measure(function () {
                    return tableEl.getComputedSize({
                        styles: ['padding', 'border', 'margin']
                    });
                });
                [tdEl, trEl, tbodyEl, tableEl].each(function (el) {
                    el.dispose();
                });
                onComplete(computedSize);
            }
            if (imageUrls.length > 0) {
                // When the images are done loading inject the clone and
                // measure it. Then render the modal with the correct
                // width/height.
                Asset.images(imageUrls, {
                    onComplete: onSizeComplete.pass([onComplete], this)
                });
            } else {
                onSizeComplete.apply(this, [onComplete]);
            }
        },
        attachEvents: function () {
            /* Attach events for modal to function. */
            var panelParentEl = $(document.body);
            panelParentEl.addEvents(this.panelParentEvents);
            this.overlayEl.addEvents(this.overlayEvents);
            window.addEvents(this.windowEvents);
            this.addEvents(this.ourEvents);
        },
        detachEvents: function () {
            /* Detach events for modal to function. */
            var panelParentEl = $(document.body);
            this.overlayEl.removeEvents(this.overlayEvents);
            panelParentEl.removeEvents(this.panelParentEvents);
            window.removeEvents(this.windowEvents);
            this.removeEvents(this.ourEvents);
        },
        show: function () {
            /* Make the modal visible. */
            this.recomputePanelDimensions();
            this.showing = true;
            this.attachEvents();
            this.overlayEl.setStyles(Object.merge(
                this.getOverlaySize(), {
                display: 'block'
            }));
            this.panelEl.setStyles(Object.merge(
                this.getComputedPanelSize(),
                this.getComputedPanelPosition(), 
                this.getOverflowStyles(), {
                display: 'block'
            }));
            this.fireEvent('panelShown');
        },
        hide: function () {
            /* Hide the modal so it is not visible. */
            this.showing = false;
            this.contentOptions = null;
            this.detachEvents();
            this.panelEl.setStyle('display', 'none');
            this.overlayEl.setStyle('display', 'none');
            // Clear out panel so old ids/classes aren't sitting around.
            this.panelEl.empty();
            this.fireEvent('panelHidden');
        },
        getPanelWidth: function () {
            /* Get the panel width from contentOptions and options. */
            if (this.contentOptions !== null &&
                    this.contentOptions.hasOwnProperty('panelWidth')) {
                return this.contentOptions.panelWidth;
            } else {
                return this.options.panelWidth;
            }
        },
        getPanelHeight: function () {
            /* Get the panel height from contentOptions and options. */
            if (this.contentOptions !== null &&
                    this.contentOptions.hasOwnProperty('panelHeight')) {
                return this.contentOptions.panelHeight;
            } else {
                return this.options.panelHeight;
            }
        },
        getOverlaySize: function () {
            /* Get the position for the overlay element. */
            var windowScrollSize = window.getScrollSize();
            return {
                width: windowScrollSize.x + 'px',
                height: windowScrollSize.y + 'px'
            };
        },
        updateContentSize: function (sizeOptions, onComplete) {
            /* Update content size if necessary.

            The argument onComplete will be called when the content size
            has been updated. */
            var contentCloneEl, onSizeComputed;
            if (this.contentOptions.hasOwnProperty('autosize') &&
               this.contentOptions.autosize) {
                // TODO: We should clean this up.
                contentCloneEl = this.panelEl.getChildren()[0].clone(true);
                onSizeComputed = (function (computedSize) {
                    if (sizeOptions.hasOwnProperty('canShrink') &&
                            sizeOptions.canShrink) {
                        this.contentOptions.panelWidth =
                                computedSize.totalWidth;
                        this.contentOptions.panelHeight =
                                computedSize.totalHeight;
                    } else {
                        if (this.contentOptions.panelWidth <
                                computedSize.totalWidth) {
                            this.contentOptions.panelWidth =
                                    computedSize.totalWidth;
                        }
                        if (this.contentOptions.panelHeight <
                                computedSize.totalHeight) {
                            this.contentOptions.panelHeight =
                                    computedSize.totalHeight;
                        }
                    }
                    onComplete();
                }).bind(this);
                this.measureContentComputedSize(contentCloneEl,
                        onSizeComputed);
            } else {
                onComplete();
            }
        },
        recomputePanelDimensions: function () {
            /* Get the position and size for the panel element. */
            var windowSize, panelXMargin, panelYMargin, panelWidth,
                    panelHeight, windowScroll, actualHeight, actualWidth;
            windowSize = window.getSize();
            actualWidth = panelWidth = this.getPanelWidth();
            if (windowSize.x >= panelWidth) {
                panelXMargin = (windowSize.x - panelWidth) / 2;
            } else {
                panelXMargin = 0;
                panelWidth = windowSize.x;
            }
            actualHeight = panelHeight = this.getPanelHeight();
            if (windowSize.y >= panelHeight) {
                panelYMargin = (windowSize.y - panelHeight) / 2;
            } else {
                panelYMargin = 0;
                panelHeight = windowSize.y;
            }
            // Save these so they don't have to be recomputed.
            this.computedPanelDimensions = {
                xMargin: panelXMargin,
                yMargin: panelYMargin,
                width: panelWidth,
                height: panelHeight,
                actualWidth: actualWidth,
                actualHeight: actualHeight
            };
        },
        getComputedPanelPosition: function () {
            /* Get the position of where the panel *should* be.

            Note that the panelXMargin/panelYMargin should only be
            re-calculated when loading new content or on resize of the window.
            */
            var left, top, windowScroll, windowScrollSize, position;
            windowScroll = window.getScroll();
            windowScrollSize = window.getScrollSize();
            position = {};
            if (this.computedPanelDimensions.actualWidth +
                    (this.computedPanelDimensions.xMargin * 2) +
                    windowScroll.x < windowScrollSize.x) {
                position.left = this.computedPanelDimensions.xMargin +
                        windowScroll.x + 'px';
            }
            if (this.computedPanelDimensions.actualHeight +
                    (this.computedPanelDimensions.yMargin * 2) +
                    windowScroll.y < windowScrollSize.y) {
                position.top = this.computedPanelDimensions.yMargin +
                        windowScroll.y + 'px';
            }
            return position;
        },
        getComputedPanelSize: function () {
            return {
                width: this.computedPanelDimensions.width + 'px',
                height: this.computedPanelDimensions.height + 'px'
            };
        },
        getOverflowStyles: function () {
            /* Sets the overflow when the modal physically is larger than the
                    window.
            */
            if (this.computedPanelDimensions.width <
                    this.computedPanelDimensions.actualWidth ||
                    this.computedPanelDimensions.height <
                    this.computedPanelDimensions.actualHeight) {
                return {
                    overflow: 'scroll'
                };
            } else {
                return {
                    overflow: 'auto'
                };
            }
        },
        panelParentKeydown: function (e) {
            /* Handles key events in the panel parent.

            Close the modal when esc is pressed. */
            if (e.key === 'esc') {
                if (this.showing) {
                    this.hide();
                }
            }
        },
        overlayClick: function (e) {
            /* Handles a click on the overlay element. 

            Clicking on overlay should close the modal. */
            if (this.showing) {
                this.hide();
            }
        },
        windowResize: function (e) {
            /* Handles window resize.

            Re-positions and re-sizes the overlay and panel.
            */
            var onComplete, panelStyles;
            if (this.showing) {
                onComplete = (function () {
                    this.recomputePanelDimensions();
                    this.overlayEl.setStyles(this.getOverlaySize());
                    panelStyles = Object.merge(this.getComputedPanelSize(),
                            this.getComputedPanelPosition(),
                            this.getOverflowStyles());
                    this.panelEl.setStyles(panelStyles);
                }).bind(this);
                if (this.contentOptions.hasOwnProperty('autosize') &&
                    this.contentOptions.autosize) {
                    this.updateContentSize({
                        canShrink: true
                    }, onComplete);
                } else {
                    onComplete();
                }
            }
        },
        windowScroll: function (e) {
            /* When the user scrolls up and down in the window.

            Re-positions the overlay.
            */
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
                    this.panelEl.setStyles(this.getComputedPanelPosition());
                }
            }
        },
        contentChanged: function () {
            /* When the application changes the content of the panel.

            This should not decrease the size, only increase it.
            */
            var onComplete, panelStyles;
            if (this.showing) {
                onComplete = (function () {
                    this.recomputePanelDimensions();
                    this.overlayEl.setStyles(this.getOverlaySize());
                    panelStyles = Object.merge(this.getComputedPanelSize(),
                            this.getComputedPanelPosition(),
                            this.getOverflowStyles());
                    this.panelEl.setStyles(panelStyles);
                }).bind(this);
                if (this.contentOptions.hasOwnProperty('autosize') &&
                    this.contentOptions.autosize) {
                    this.updateContentSize({
                        canShrink: false
                    }, onComplete);
                } else {
                    onComplete();
                }
            }
        },
        inPanel: function (el) {
            /* Check if the given element is in the panel. */
            return this.panelEl.contains(el);
        }
    });

    // Until a better namespacing mechanism exists I guess this is it.
    window.Modal = Modal;
    
})();
