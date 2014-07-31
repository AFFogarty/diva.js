/*
Bookmark locations in the document.
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
                // Check if the browser can do local storage
                if (typeof(Storage) !== "undefined") {
                    if (localStorage.getItem("diva-bookmarks") === undefined)
                    {
                        // Set the empty bookmark list
                        localStorage.setItem("diva-bookmarks", []);
                    }
                    // Grab the list
                    var bookmarkObject = localStorage.getItem("diva-bookmarks");
                } else {
                    // User's browser doesn't support local storage
                    return true;
                }

                return true;
            },
            pluginName: 'bookmark',
            titleText: 'Bookmark document locations'
        };
        return retval;
    })());
})(jQuery);
