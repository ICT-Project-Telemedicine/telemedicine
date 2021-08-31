$(document).ready(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
            var latitude = pos.coords.latitude;
            var longitude = pos.coords.longitude;
            loadMap(latitude, longitude);
        });
    } else {
        var latitude = 37.579778;
        var longitude = 126.977083;
        loadMap(latitude, longitude);
    }
});

loadMap = (latitude, longitude) => {
    var container = document.getElementById('map');
    
    // 인포윈도우 생성
    var infowindow = new kakao.maps.InfoWindow({zIndex:1});
    
    // 마커 배열
    markers = []
    
    // 지도 생성 옵션
    var options = {
        center: new kakao.maps.LatLng(latitude, longitude),
        level: 4
    };

    // 지도 생성
    var map = new kakao.maps.Map(container, options);
    
    // 장소 객체
    var places = new kakao.maps.services.Places(map);
    
    // idle 이벤트 등록 (지도 커졌다 작아졌다)
    kakao.maps.event.addListener(map, 'idle', searchPlaces);

    // 약국 검색
    places.categorySearch('PM9', placesSearchCallBack, {useMapBounds:true}); 

    // 키워드 검색 완료 시 호출되는 콜백함수
    function placesSearchCallBack (data, status, pagination) {
        if (status === kakao.maps.services.Status.OK) {
            for (var i=0; i<data.length; i++) {
                displayMarker(data[i]);    
            }  
            // displayPlaces(data);     
        }
    }
    
    // 마커 표시
    function displayMarker (place) {
        // 마커 생성 및 지도에 표시
        var marker = new kakao.maps.Marker({
            map: map,
            position: new kakao.maps.LatLng(place.y, place.x) 
        });

        // 마커 클릭이벤트 등록
        kakao.maps.event.addListener(marker, 'click', function() {
            infowindow.setContent(`<div style="padding:5px;font-size:12px;"><a href=${place.place_url}>${place.place_name}</a></div>`);
            infowindow.open(map, marker);
        });

        marker.setMap(map);
        markers.push(marker);
    }

    // idle 이벤트
    function searchPlaces() {
        // 지도에 표시되고 있는 마커를 제거합니다
        removeMarker();
        places.categorySearch('PM9', placesSearchCallBack, {useMapBounds:true}); 
    }

    // 삭제
    function removeMarker() {
        for ( var i = 0; i < markers.length; i++ ) {
            markers[i].setMap(null);
        }   
        markers = [];
    }

    // 마커 표시
    function displayPlaces(places) {
        for ( var i=0; i<places.length; i++ ) {
            // 마커 생성 및 지도에 표시
            var marker = new kakao.maps.Marker({
                map: map,
                position: new kakao.maps.LatLng(places[i].y, places[i].x)
            });
            
            // 마커 클릭이벤트 등록
            (function(marker, place) {
                kakao.maps.event.addListener(marker, 'click', function() {
                    displayPlaceInfo(place);
                });
            })(marker, places[i]);
        }
    }

    function displayPlaceInfo (place) {
        var content = '<div class="placeinfo">' +
                        '   <a class="title" href="' + place.place_url + '" target="_blank" title="' + place.place_name + '">' + place.place_name + '</a>';   
    
        if (place.road_address_name) {
            content += '    <span title="' + place.road_address_name + '">' + place.road_address_name + '</span>' +
                        '  <span class="jibun" title="' + place.address_name + '">(지번 : ' + place.address_name + ')</span>';
        }  else {
            content += '    <span title="' + place.address_name + '">' + place.address_name + '</span>';
        }                
       
        content += '    <span class="tel">' + place.phone + '</span>' + 
                    '</div>' + 
                    '<div class="after"></div>';
    
        placeOverlay.setPosition(new kakao.maps.LatLng(place.y, place.x));
        placeOverlay.setMap(map);  
    }
}