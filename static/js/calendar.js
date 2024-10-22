document.addEventListener('DOMContentLoaded', function() {
    var secretKey = "{{ contents_secret_key }}";
    var calendarEl = document.getElementById('calendar');

    function updateDataChangedFlag(value) {
        var currentTime = new Date().toISOString();
        return db.meta.put({key: 'eventsChanged', value: value, lastUpdated: currentTime});
    }

    function saveEvents(calendar) {
        var events = calendar.getEvents().map(e => {
            var event = e.toPlainObject();
            event.title = CryptoJS.AES.encrypt(event.title, secretKey).toString();
            return event;
        });
        db.events.clear().then(function() {
            db.events.bulkPut(events).then(function() {
                updateDataChangedFlag(true);  // 데이터 변경 플래그 업데이트
            });
        });
    }

    function loadEvents(calendar) {
        db.events.toArray().then(function(events) {
            events.forEach(function(event) {
                event.title = CryptoJS.AES.decrypt(event.title, secretKey).toString(CryptoJS.enc.Utf8);
                calendar.addEvent(event);
            });
        });
    }

    window.uploadData = function uploadData() {
        return db.meta.get('eventsChanged').then(function(meta) {
            if (meta && meta.value) {
                return db.events.toArray()
                    .then(function(events) {
                        console.log(events);  // events 객체 로깅
                        return fetch('/store_db', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({events: events})
                        });
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw Error(response.statusText);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log(data);
                        return updateDataChangedFlag(false);  // 데이터 업로드 성공 후 플래그 업데이트
                    })
                    .catch(function(error) {
                        alert('데이터 업로드에 실패했습니다. 다시 시도해주세요.');
                        console.error('Error:', error);  // 에러 로깅
                    });
            } else {
                console.log('No changes to upload.');  // 변경사항 없음 로깅
            }
        });
    }

    window.downloadData = function downloadData() {
        fetch('/get_recent_file')
            .then(response => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response.json();
            })
            .then(data => {
                replaceEvents(data);
                alert('데이터 다운로드에 성공했습니다.');
            })
            .catch(error => {
                alert('데이터 다운로드에 실패했습니다. 다시 시도해주세요.');
                console.error('Error:', error);
            });
    }

    function replaceEvents(data) {
        calendar.removeAllEvents();
        data.forEach(event => {
            event.title = CryptoJS.AES.decrypt(event.title, secretKey).toString(CryptoJS.enc.Utf8);
            calendar.addEvent(event);
        });
        calendar.render();
    }

    var calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'ko',
        initialView: 'listWeek',
        headerToolbar: {
            left: 'listWeek timeGridWeek,dayGridYear',
            center: 'title',
            right: 'today prev,next custom'
        },
        slotDuration: '00:10:00',
        slotMinTime: '08:30:00',
        slotMaxTime: '16:30:00',
        defaultTimedEventDuration: '00:40:00',
        editable: true,
        eventResizableFromStart: true,
        eventStartEditable: true,
        selectable: true,
        nowIndicator: true,
        hiddenDays: [ 0, 6 ],
        customButtons: {
            custom: {
                text: '📥',
                click: function() {
                    downloadData();
                }
            }
        },
        dateClick: function(info) {
            var newEvent = {
                id: Date.now(), // 고유한 ID를 부여
                title: "새 이벤트",
                start: info.dateStr,
                allDay: info.allDay
            };
            calendar.addEvent(newEvent);
            saveEvents(calendar);
        },
        eventChange: function(info) {
            saveEvents(calendar);
        },
        eventClick: function(info) {
            // 모달에 현재 이벤트 정보 입력
            $('#event-title').val(info.event.title);

            // 배경색이 설정되어 있으면 해당 색상을 사용하고, 그렇지 않은 경우 기본 색상 코드를 사용
            var backgroundColor = info.event.backgroundColor || '#3788D8';
            $('#event-color').val(backgroundColor);

            // 모달 저장 버튼 클릭 이벤트
            $('#save-event').off('click').on('click', function() {
                var title = $('#event-title').val();
                var color = $('#event-color').val();

                if (title) {
                    info.event.setProp('title', title);
                    info.event.setProp('backgroundColor', color);
                    info.event.setProp('borderColor', color);
                    $('#eventModal').modal('hide');
                    saveEvents(calendar); // 이벤트 저장 로직
                } else {
                    // 제목이 없으면 삭제 확인
                    if (confirm('이 이벤트를 삭제하시겠습니까?')) {
                        info.event.remove();
                        $('#eventModal').modal('hide');
                    }
                }
            });

            // 모달 삭제 버튼 클릭 이벤트
            $('#delete-event').off('click').on('click', function() {
                info.event.remove();
                $('#eventModal').modal('hide');
                saveEvents(calendar); // 이벤트 삭제 로직
            });

            $('#eventModal').modal('show');
        },
        eventDrop: function(info) {
            var isCopy = confirm("이 이벤트를 복제하시겠습니까? '확인'을 누르면 복제, '취소'를 누르면 이동합니다.");

            if (isCopy) {
                var copiedEvent = Object.assign({}, info.event.extendedProps, { // 이벤트를 복제합니다.
                    id: Date.now(), // 고유한 ID를 부여
                    title: info.event.title,
                    start: info.event.start,
                    end: info.event.end,
                    allDay: info.event.allDay,
                    backgroundColor: info.event.backgroundColor,
                    borderColor: info.event.borderColor,
                });
                calendar.addEvent(copiedEvent); // 새 위치에 복제된 이벤트를 추가합니다.
                info.revert(); // 원본 이벤트를 원래 위치로 되돌립니다.

            } else {
                // 이벤트를 이동합니다. (기본 동작)
            }
            saveEvents(calendar); // 변경된 이벤트 저장
        },
    });


    loadEvents(calendar); // 이벤트를 불러온다

    calendar.render();
});
