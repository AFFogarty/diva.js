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
                    if (localStorage.getItem("diva-bookmarks") === null)
                    {
                        // Set the empty bookmark list
                        localStorage.setItem("diva-bookmarks", JSON.stringify([]));
                    }
                    // Grab the list
                    var bookmarkObject = JSON.parse(localStorage.getItem("diva-bookmarks"));
                    console.log("BookmarkObject: ");
                    console.log(bookmarkObject);
                } else {
                    // User's browser doesn't support local storage
                    console.log("Browser does not support local storage.");
                    return true;
                }

                function _add_bookmark(pageIndex)
                {
                    bookmarkObject.push(parseInt(pageIndex));
                }

                /**
                 * Sort the bookmark list by page.
                 *
                 * @private
                 */
                function _sort_bookmarks()
                {
                    // TODO
                }

                /**
                 * Persist the bookmarks to the user's browser.
                 *
                 * @private
                 */
                function _save_bookmarks()
                {
                    localStorage.setItem("diva-bookmarks",
                        JSON.stringify(bookmarkObject));
                }

                divaInstance.bookmarkCurrentLocation = function()
                {
                    _add_bookmark(5);
                    _save_bookmarks();
                };

                divaInstance.getBookmarks = function()
                {
                    return bookmarkObject;
                };

                return true;
            },
            pluginName: 'bookmark',
            titleText: 'Bookmark document locations'
        };
        return retval;
    })());
})(jQuery);
