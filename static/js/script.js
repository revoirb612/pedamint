$(document).ready(function () {
    toggleSidebar();

    $('#sidebarCollapse').on('click', function () {
        toggleSidebar();
    });

    // Load all tabs from the 'tabs' store
    db.tabs.each(function(tab) {
        addTab(tab);
    });
});

function toggleSidebar() {
    // 사이드바와 콘텐츠의 'active' 클래스 토글
    $('#sidebar, #content').toggleClass('active');

    // CSS Transition이 완료되는 시점을 감지하기 위해 setTimeout 사용
    setTimeout(function() {
        // outerWidth(true)를 사용하여 사이드바의 전체 너비(마진 포함) 계산
        var sidebarWidth = $('#sidebar').outerWidth(true);

        if ($('#sidebar').hasClass('active')) {
            $('#content').css('margin-left', sidebarWidth + 'px');
            $('#sidebarCollapse').css('left', sidebarWidth + 'px');
            $('#toggleIcon').removeClass('fa-arrow-right').addClass('fa-arrow-left');
        } else {
            $('#content').css('margin-left', '0');
            $('#sidebarCollapse').css('left', '0');
            $('#toggleIcon').removeClass('fa-arrow-left').addClass('fa-arrow-right');
            window.uploadData();  // 사이드바 비활성화 시 데이터 업로드
        }
    }, 200); // Transition 지속 시간에 따라 조절. 예시에서는 200ms로 가정
}

function addTab(tab) {
    // Add new tab header
    $('<li class="nav-item"><a class="nav-link" id="' + tab.id + '" data-toggle="pill" href="#content' + tab.id + '"><span class="tab-title">' + tab.filename + '</span> <span class="close">×</span></a></li>').insertBefore('#addTabLi');

    // Add new tab content
    $('#tabBody').append('<div class="tab-pane" id="content' + tab.id + '"><iframe id="iframe' + tab.id +'" src="' + tab.content + '"></iframe></div>');

    // Activate the new tab
    $('#' + tab.id).tab('show');
}