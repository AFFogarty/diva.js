/*
Textual annotation plugin for diva.js
Allows you to highlight regions of a page image
*/

(function ($)
{
    window.divaPlugins.push((function()
    {
        var settings = {};
        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                // Initialize an empty highlights object.
                divaSettings.parentSelector.data(
                        'annotations',
                        {
                            page: {},
                            area: {}
                        });
                var annotationObj = divaSettings.parentSelector.data('annotations');
                
                // Event handlers
                diva.Events.subscribe("VisiblePageDidChange", _page_change_event_handler);  
                
                /*
                 * Private functions
                 */
                
                /**
                 * Callback function fired when the page changes.
                 * 
                 * @param {type} pageIdx
                 * @returns {undefined}
                 */
                function _page_change_event_handler(pageIdx, pageName)
                {
                    if (annotationObj.page[pageIdx])
                    {
                        // Print it out to the console.
                        diva.Events.publish("PageAnnotation", [annotationObj.page[pageIdx]]);
                    }
                }
                


                /*
                 * Public functions
                 */
                
                divaInstance.annotatePage = function(pageIdx, textContent)
                {
                    // Save it
                    annotationObj.page[pageIdx] = String(textContent);
                };
                divaInstance.getAnnotations = function()
                {
                   return annotationObj;
                };
                
                return true;
            },
            pluginName: 'annotate',
            titleText: 'Annotate text on page'
        };
        return retval;
    })());
})(jQuery);
