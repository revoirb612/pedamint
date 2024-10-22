$("#addTabButton").click(function() {
    var tabID = Date.now();  // Update the tabID for the next tab

    // Add a new tab
    var newTab = {
        id: tabID,
        content: '/static/iframe/widget.html',
        filename: '새 탭'
    };

    // script.js
    addTab(newTab);

    // Activate the new tab
    $('#' + tabID).tab('show');

    // Add the new tab to the 'tabs' store
    db.tabs.put({id: tabID, content: '/static/iframe/widget.html', filename: '새 탭'});
});

// Listen for messages from the iframe
window.addEventListener('message', function(event) {
    // Check the origin of the data!
    if (event.origin !== "https://www.pedamint.com") {  // Change this to the actual origin!
        // Not the expected origin: Reject the message!
        return;
    }
    // Update the tab title
    $('#' + event.data.tabID + ' .tab-title').text(event.data.filename);

    // Update the content of the tab in the 'tabs' store
    db.tabs.update(parseInt(event.data.tabID), {content: event.data.file_url, filename: event.data.filename});
}, false);

// Add a click event to remove tabs
$(document).on('click', '.close', function(e) {
    var tabID = $(this).parent().attr('id');
    var $toActivate;

    // If the tab to be deleted is the last one (not counting the add button), activate the previous tab
    if ($('#' + tabID).parent().is(':last-child')) {
        $toActivate = $('#' + tabID).parent().prev().find('a');
    }
    // If not, activate the next tab (if it's not the add button)
    else {
        $toActivate = $('#' + tabID).parent().next().find('a');
        if ($toActivate.attr('id') === 'addTabButton') {
            $toActivate = $('#' + tabID).parent().prev().find('a');
        }
    }

    // Remove the clicked tab and its content
    $('#' + tabID).parent().remove();
    $('#content' + tabID).remove();

    // Remove the tab from the 'tabs' store
    db.tabs.delete(parseInt(tabID));

    // Check if there are any tabs left
    if ($('#tabHeader a').length === 1) { // Only '+' button is left
        // Add a new tab
        var newTab = {
            id: Date.now(),
            content: '/static/iframe/widget.html',
            filename: '새 탭'
        };
        addTab(newTab);
    } else {
        // Activate the next or previous tab
        if ($toActivate.length) {
            $toActivate.tab('show');
        }
    }
});
