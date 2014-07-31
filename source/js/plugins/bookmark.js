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
//                Bookmark the current location if event called
//                diva.Events.subscribe("BookmarkCurrentLocation", divaInstance.bookmarkCurrentLocation);

                // Create the pop-up window.
                $("body").append('<div class="diva-bookmarks">Lol</div>');
                var bookmarksDiv = $(".diva-bookmarks");
                console.log(bookmarksDiv);

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
                    // Print out the list of bookmarks
                    _render_gui_panel();
                    console.log("BookmarkObject: ");
                    console.log(bookmarkObject);
                } else {
                    // User's browser doesn't support local storage
                    console.log("Browser does not support local storage.");
                    return true;
                }

                function _add_bookmark(pageIndex, name)
                {
                    // The bookmark object that we will save
                    var bookmark = {
                        page: pageIndex,
                        name: name
                    };

                    bookmarkObject.push(bookmark);
                    diva.Events.publish("BookmarksUpdated", bookmarkObject);
                    _render_gui_panel();
                    return bookmark;
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

                /**
                 * Fill bookmarksDiv with the correct content.
                 *
                 * @private
                 */
                function _render_gui_panel()
                {
                    var content = "<ul>";

                    for (var i = 0; i < bookmarkObject.length; i++)
                    {
                        content += '<li><a href="' + bookmarkObject[i]["page"]
                            + '">' + bookmarkObject[i]["name"] + "</a></li>";
                    }
                    content += "</ul>";

                    bookmarksDiv.html(content);
                }

                /**
                 * Save Diva's current location as a bookmark.
                 */
                divaInstance.bookmarkCurrentLocation = function()
                {
                    var name = "Bookmark " + bookmarkObject.length;

                    _add_bookmark(divaInstance.getCurrentPageNumber(), name);
                    _save_bookmarks();
                };

                /**
                 * Remove a bookmark from the list of bookmarks.
                 *
                 * @param index 0-indexed integer
                 */
                divaInstance.removeBookmark = function(index)
                {
                    bookmarkObject.splice(index, 1);
                    _save_bookmarks();
                };

                /**
                 *
                 *
                 * @returns array The bookmark array
                 */
                divaInstance.getBookmarks = function()
                {
                    return bookmarkObject;
                };

                /**
                 * Diva goes to the location of the specified bookmark.
                 *
                 * @param index 0-indexed integer
                 */
                divaInstance.goToBookmark = function(index)
                {
                    divaInstance.gotoPageByNumber(bookmarkObject[parseInt(index)].page);
                };

                return true;
            },
            handleClick: function(event)
            {
                $(".diva-bookmarks").show();
                return false;
            },
            pluginName: 'bookmark',
            titleText: 'Bookmark document locations'
        };
        return retval;
    })());
})(jQuery);