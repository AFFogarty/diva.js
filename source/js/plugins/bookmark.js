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
//                localStorage.clear();
                // Check if the browser can do local storage
                if (typeof(Storage) !== "undefined") {
                    if (localStorage.getItem("diva-bookmarks") === null)
                    {
                        // Set the empty bookmark list
                        localStorage.setItem("diva-bookmarks", JSON.stringify([]));
                    }
                    // Grab the list
                    console.log(localStorage.getItem("diva-bookmarks"));
                    console.log(JSON.parse(localStorage.getItem("diva-bookmarks")));
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
                    bookmarkObject.sort(function(a,b){return a-b;});
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
                    _add_bookmark(divaInstance.getCurrentPageNumber());
                    _sort_bookmarks();
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
