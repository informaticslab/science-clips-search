var SciClipsSearchModule = (function(){
    //TODO: clean this up for cases where data is not present
    var template = _.template(
        '<ul>'
        + '<li>'
        + '<a target="_blank" href="<%=d.url%>"><%=d.short_title%></a><br/>'
        + '<% if(d.author){print(d.author +"<br/>")}%>'
        + '<% if(d.secondary_title){print(d.secondary_title +". ")}%><% if(d.year){print(d.year +" ")}%><% if(d.date){print(d.date +";")}%><% if(d.volume){print(d.volume +":")}%><% if(d.pages){print(d.pages +".")}%>' + '<% print("("+SciClipsSearchModule.linkToIssue(d.custom_8)+")")%>'
        + '<br/>'
        + '<% if(d.abstract){%>'
        + '<a id="plus<%=d.record_number%>" href="javascript:SciClipsSearchModule.toggleAbstract(<%=d.record_number%>)">[+]Show Abstract</a>'
        + '<a style="display:none" id="minus<%=d.record_number%>" href="javascript:SciClipsSearchModule.toggleAbstract(<%=d.record_number%>)">[-]Hide Abstract</a>'
        + '<div id="content<%=d.record_number%>" style="display: none"><%=d.abstract%></div>'
        + '<%}else{print("[No abstract]")}%>'
        + '</li><p></p>'
        + '</ul>'
    );

    var searchText;
    var offset = 0;
    var limit = 25;
    var baseSearchURL = 'https://data.cdc.gov/resource/d8c6-ee8v.json?';
    var searchURL;
    var loadingSpinner = $('#loading-spinner');
    var searchResultsContainer = $('#search-results-container');
    var moreResultsButton = $('#load-more-search-results');
    var authToken;

    var toggleAbstract = function(id) {
        $('#plus' + id).toggle();
        $('#minus' + id).toggle();
        $('#content' + id).toggle();
    };

    var resetSearch = function () {
        searchText = "test";
        offset = 0;
        searchResultsContainer.html("");
        moreResultsButton.hide();
    };

    var displaySearchResults = function(data) {
        if(offset === 0) {
            if(data.length > 0) {
                searchResultsContainer.append("<h3>Displaying results for <strong>" +searchText +"</strong>:</h3>");
                for(var i = 0; i < data.length; i++) {
                    //console.log(data[i]);
                    searchResultsContainer.append(template({d: data[i]}));
                }

                if(data.length < limit) {
                    searchResultsContainer.append("No additional results found.");
                } else {
                    moreResultsButton.show();
                }
            } else {
                searchResultsContainer.html("No results found.");
            }
        } else {
            if(data.length > 0) {
                for(var i = 0; i < data.length; i++) {
                    //console.log(data[i]);
                    searchResultsContainer.append(template({d: data[i]}));
                }
            }
            if (data.length < limit) {
                moreResultsButton.hide();
                searchResultsContainer.append("No additional results found.");
            } else {
                moreResultsButton.show();
            }
        }
    };

    var displayErrorMessage = function() {

        searchResultsContainer.html("An error has occurred.");
    };

   var performSearch = function()
   {
       //console.log(searchText);
       var searchParams = '$where=upper(abstract)%20like%20%27%25' + searchText.toUpperCase() +'%25%27'
           +'%20OR%20upper(short_title)%20like%20%27%25' + searchText.toUpperCase() +'%25%27'
           +'%20OR%20upper(author)%20like%20%27%25' + searchText.toUpperCase() +'%25%27'
           +'%20&$order=record_number%20DESC'
           +'%20&$limit=' + limit + '%20&$offset=' + offset;

       searchURL = baseSearchURL + searchParams;

       $.ajax({
        type: 'GET',
        url: searchURL,
        dataType: 'json',
        beforeSend: function (xhr) {
            getToken();
            loadingSpinner.toggle();
            xhr.setRequestHeader("X-APP-TOKEN", "1XGlTdFOCn5DilvbOnya6Je0P");
            xhr.setRequestHeader("Authorization", "OAuth " +authToken);
        }
    })
        .success(function (data) {
            loadingSpinner.toggle();
            //console.log(data);
            displaySearchResults(data);
        })
        .fail(function () {
            loadingSpinner.toggle();
            displayErrorMessage();
        })
};
   
   var getMoreResults =  function () {
       moreResultsButton.hide();
       offset = offset + limit;
   };

    var linkToIssue = function(data) {
        if (data) {
            var info = data.split(":");
            if (info.length > 1 && info[0] !== null && info[1] !== null) {
                var base = '<a target="_blank" href="https://www.cdc.gov/library/sciclips/issues/';
                var vol = info[0];
                var issue = info[1].substring(0, 2).trim();
                return base + 'v' + vol + 'issue' + issue + '.html">Science Clips Volume ' + vol + ' Issue ' + issue +'</a>';
            }
        }
    };

    var getToken = function () {
        var url = new URL(window.location);
        $.ajax({
            type: 'POST',
            url: 'https://data.cdc.gov/oauth/access_token?client_id=1XGlTdFOCn5DilvbOnya6Je0P&client_secret=Tlnq7eQ9CzK2_s7d7-_F7dcPzW7rncnEp2b7&grant_type=authorization_code&code=' +url.searchParams.get("code")})
            .success(function (token) {
                authToken = token.access_token;
            })
            .fail(function () {
                alert('fail');
            });
    };

    var getSearchText = function () {
        return searchText;
    };

    var setSearchText = function (text) {
        searchText = text;
    };

    return {
        setSearchText: setSearchText,
        getSearchText: getSearchText,
        resetSearch: resetSearch,
        performSearch: performSearch,
        getMoreResults: getMoreResults,
        linkToIssue: linkToIssue,
        toggleAbstract: toggleAbstract,
    };
})();


$(document).ready(function () {
    var search = function () {
        var text = $('#search-text').val();
        if(text !== SciClipsSearchModule.getSearchText()) {
            SciClipsSearchModule.resetSearch();
            SciClipsSearchModule.setSearchText(text);
            SciClipsSearchModule.performSearch();
        };
    };
    $('#search-button').click(function () {
        //SciClipsSearchModule.getToken();
        search();
    });
    $('#search-text').keydown(function (event) {
        if(event.keyCode === 13){
            search();
        }
    });
    $('#load-more-search-results').click(function () {
        SciClipsSearchModule.getMoreResults();
        SciClipsSearchModule.performSearch();
    });
});

