var SciClipsSearchModule = (function(){
    var template = _.template(
        '<ul>'
        + '<li>'
        + '<a target="_blank" href="<%=d.url%>"><%=d.short_title%></a><br/>'
        + '<% if(d.author){print(d.author +"<br/>")}%>'
        + '<% if(d.secondary_title){print(d.secondary_title +". ")}%><% if(d.year){print(d.year +" ")}%><% if(d.date){print(d.date +";")}%><% if(d.volume){print(d.volume +":")}%><% if(d.pages){print(d.pages +".")}%>' + '<% if(d.custom_8){ print("("+SciClipsSearchModule.linkToIssue(d.custom_8)+")")}%>'
        + '<br/>'
        + '<% if(d.custom_2){print(d.custom_2 +"<br/>")}%>'
        + '<% if(d.custom_1){print(d.custom_1 +"<br/>")}%>'
        + '<% if(d.abstract){%>'
        + '<a id="plus<%=d.record_number%>" href="javascript:SciClipsSearchModule.toggleAbstract(<%=d.record_number%>)">[+]Show Abstract</a>'
        + '<a style="display:none" id="minus<%=d.record_number%>" href="javascript:SciClipsSearchModule.toggleAbstract(<%=d.record_number%>)">[-]Hide Abstract</a>'
        + '<div id="content<%=d.record_number%>" style="display: none"><%=d.abstract%></div>'
        + '<%}else{print("[No abstract]")}%>'
        + '</li><p></p>'
        + '</ul>'
    );

    var titleAndAbstractSearchText;
    var authorSearchText;
    var publicationTitle;
    var publicationYearFrom;
    var publicationYearTo;
    var topicHeadingSearchText;
    var articleType = {
        cdcAuthored: {
            queryString: 'CDC Authored Publications',
            isChecked: false,
            value: false
        },
        cdcVitalSigns: {
            queryString: 'CDC Vital Signs',
            isChecked: false,
            value: false
        },
        keyArticles: {
            queryString: 'Key Scientific Articles in Featured Topic Areas',
            isChecked: false,
            value: false
        },
        mediaNotedArticles: {
            queryString: 'Public Health Articles Noted in the Media',
            isChecked: false,
            value: false
        }
    };
    var offset = 0;
    var limit = 25;
    var currentQueryRecordCount = 0;
    var baseSearchURL = 'https://data.cdc.gov/resource/d8c6-ee8v.json?';
    var likeSearchString;
    var searchURL;
    var loadingSpinner = $('#loading-spinner');
    var searchResultsContainer = $('#search-results-container');
    var prev25ResultsButton = $('#prev-25-search-results');
    var next25ResultsButton = $('#next-25-search-results');
    var searchResultsControlPanel = $('#search-results-control-panel');

    var toggleAbstract = function(id) {
        $('#plus' + id).toggle();
        $('#minus' + id).toggle();
        $('#content' + id).toggle();
    };

    var resetSearch = function () {
        //searchText = "reset";
        offset = 0;
        currentQueryRecordCount = 0;
        searchResultsContainer.html("");
        searchResultsControlPanel.hide();
        next25ResultsButton.hide();
        prev25ResultsButton.hide();
    };

    var displaySearchResults = function(data) {
        searchResultsContainer.html("");
        if(data.length > 0) {
            searchResultsContainer.append("<h3>Displaying results " +(offset + 1) +" to " +(offset + data.length) +" of " +currentQueryRecordCount +":</h3>");
        }
        if(offset === 0) {
            if(data.length > 0) {
                for(var i = 0; i < data.length; i++) {
                    //console.log(data[i]);
                    searchResultsContainer.append(template({d: data[i]}));
                }

                if(currentQueryRecordCount <= limit) {
                    searchResultsContainer.append("No additional results found.");
                } else {
                    next25ResultsButton.show();
                    searchResultsControlPanel.show();
                }
            } else {
                searchResultsContainer.html("No results found.");
            }
        } else {
            prev25ResultsButton.show();
            searchResultsControlPanel.show();
            if(data.length > 0) {
                for(var i = 0; i < data.length; i++) {
                    //console.log(data[i]);
                    searchResultsContainer.append(template({d: data[i]}));
                }
            }
            if (currentQueryRecordCount - offset <= limit) {
                next25ResultsButton.hide();
            } else {
                next25ResultsButton.show();
            }
        }
        $(document).scrollTop($("#search-results-container").offset().top);
    };

    var displayErrorMessage = function() {

        searchResultsContainer.html("An error has occurred.");
    };

    var performSearch = function() {
        likeSearchString = '(UPPER(abstract)%20LIKE%20%27%25' + titleAndAbstractSearchText.toUpperCase() + '%25%27'
            + '%20OR%20UPPER(short_title)%20LIKE%20%27%25' + titleAndAbstractSearchText.toUpperCase() + '%25%27)'
            + (authorSearchText.length > 0 ? '%20AND%20UPPER(author)%20LIKE%20%27%25' + authorSearchText.toUpperCase() + '%25%27' : '')
            + (publicationTitle.length > 0 ? '%20AND%20UPPER(secondary_title)%20LIKE%20%27%25' + publicationTitle.toUpperCase() + '%25%27' : '')
            + (publicationYearFrom.length > 0 ? '%20AND%20year>=' +publicationYearFrom : '')
            + (publicationYearTo.length > 0 ? '%20AND%20year<=' +publicationYearTo : '')
            + (topicHeadingSearchText.length > 0 ? '%20AND%20UPPER(custom_2)%20LIKE%20%27%25' + topicHeadingSearchText.toUpperCase() +'%25%27' : '')
            + generateArticleTypeQuery();

        var orderString = '%20&$ORDER=record_number%20DESC';
        var limitString = '%20&$LIMIT=' + limit;
        var offsetString = '%20&$OFFSET=' + offset;

        var searchParams = '$WHERE=' + likeSearchString + orderString + limitString + offsetString;
        searchURL = baseSearchURL + searchParams;

        var countURL = baseSearchURL + "$SELECT=SUM(CASE(" + likeSearchString + ",%201,%20FALSE,%200))%20AS%20count";

        loadingSpinner.toggle();

        if (offset === 0) {
            $.ajax({
                type: 'GET',
                url: countURL,
                dataType: 'json',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("X-APP-TOKEN", "1XGlTdFOCn5DilvbOnya6Je0P");
                }
            })
                .success(function (data) {
                    currentQueryRecordCount = data[0].count;
                    $.ajax({
                        type: 'GET',
                        url: searchURL,
                        dataType: 'json',
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader("X-APP-TOKEN", "1XGlTdFOCn5DilvbOnya6Je0P");
                        }
                    })
                        .success(function (data) {
                            loadingSpinner.toggle();
                            displaySearchResults(data)
                        })
                        .fail(function () {
                            loadingSpinner.toggle();
                            displayErrorMessage();
                        })
                })
                .fail(function () {
                    loadingSpinner.toggle();
                    displayErrorMessage();
                })
        } else {
            $.ajax({
                type: 'GET',
                url: searchURL,
                dataType: 'json',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("X-APP-TOKEN", "1XGlTdFOCn5DilvbOnya6Je0P");
                }
            })
                .success(function (data) {
                    loadingSpinner.toggle();
                    displaySearchResults(data)
                })
                .fail(function () {
                    loadingSpinner.toggle();
                    displayErrorMessage();
                })
        }
    };

    var generateArticleTypeQuery = function () {
        var articleTypeQueryString = '';
        var selectedTypes = _.filter(articleType, function(type){return type.value === true});
        if(selectedTypes.length === 0) {
            return articleTypeQueryString;
        }
        for(var i = 0; i < _.size(selectedTypes); i++) {
            articleTypeQueryString += i !==0 ? '%20OR%20' : '' ;
            articleTypeQueryString += 'custom_1=%27' +selectedTypes[i].queryString +'%27';
        }
        return '%20AND(' +articleTypeQueryString +')';
    };

    var getNext25Results =  function () {
        prev25ResultsButton.hide();
        next25ResultsButton.hide();
        searchResultsControlPanel.hide();
        offset = offset + limit;
    };

    var getPrev25Results = function () {
        prev25ResultsButton.hide();
        next25ResultsButton.hide();
        searchResultsControlPanel.hide();
        offset = offset - limit;
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

    var getSearchText = function () {
        return {
            titleAndAbstractSearchText: titleAndAbstractSearchText,
            authorSearchText: authorSearchText,
            publicationYearFrom: publicationYearFrom,
            publicationYearTo: publicationYearTo,
            topicHeadingSearchText: topicHeadingSearchText,
            publicationTitle: publicationTitle,
            articleType: articleType
        };
    };

    var setSearchText = function (text) {
        titleAndAbstractSearchText = text.titleAndAbstractSearchText;
        authorSearchText = text.authorSearchText;
        publicationYearFrom = text.publicationYearFrom;
        publicationYearTo = text.publicationYearTo;
        topicHeadingSearchText = text.topicHeadingSearchText;
        publicationTitle = text.publicationTitle;
        articleType.cdcAuthored.value = text.cdcAuthored;
        articleType.cdcVitalSigns.value = text.cdcVitalSigns;
        articleType.keyArticles.value = text.keyArticles;
        articleType.mediaNotedArticles.value = text.mediaNotedArticles;
    };

    var toggleAdvancedSearch = function () {
        $('.sci-clips-advanced-search').toggle();
    };

    return {
        setSearchText: setSearchText,
        getSearchText: getSearchText,
        resetSearch: resetSearch,
        performSearch: performSearch,
        getNext25Results: getNext25Results,
        getPrev25Results: getPrev25Results,
        linkToIssue: linkToIssue,
        toggleAbstract: toggleAbstract,
        toggleAdvancedSearch: toggleAdvancedSearch
    };
})();


$(document).ready(function () {
    $('#science-clips-search-form').trigger('reset');

    var search = function () {
        var searchText = SciClipsSearchModule.getSearchText();

        var titleAndAbstractSearchText = $('#search-text').val();
        var authorSearchText = $('#author-text').val();
        var topicHeadingSearchText = $('#topic-heading-text').val();
        var publicationTitle = $('#publication-title').val();
        var publicationYearTo = $('#publication-year-to').val();
        var publicationYearFrom = $('#publication-year-from').val();
        var cdcAuthored = $('#article_type_cdc_authored').prop('checked');
        var cdcVitalSigns = $('#article_type_cdc_vital_signs').prop('checked');
        var keyArticles = $('#article_type_key_articles').prop('checked');
        var mediaNotedArticles = $('#article_type_media_noted_articles').prop('checked');



        if(titleAndAbstractSearchText !== searchText.titleAndAbstractSearchText
            || authorSearchText !== searchText.authorSearchText
            || publicationTitle !== searchText.publicationTitle
            || publicationYearTo!== searchText.publicationYearTo
            || publicationYearFrom !== searchText.publicationYearFrom
            || cdcAuthored !== searchText.articleType.cdcAuthored.value
            || cdcVitalSigns !== searchText.articleType.cdcVitalSigns.value
            || keyArticles !== searchText.articleType.keyArticles.value
            || mediaNotedArticles !== searchText.articleType.mediaNotedArticles.value
            || topicHeadingSearchText !== searchText.topicHeadingSearchText) {
            SciClipsSearchModule.resetSearch();
            SciClipsSearchModule.setSearchText(
                {
                    titleAndAbstractSearchText: titleAndAbstractSearchText,
                    authorSearchText: authorSearchText,
                    publicationTitle: publicationTitle,
                    publicationYearTo: publicationYearTo,
                    publicationYearFrom: publicationYearFrom,
                    topicHeadingSearchText: topicHeadingSearchText,
                    cdcAuthored: cdcAuthored,
                    cdcVitalSigns: cdcVitalSigns,
                    keyArticles: keyArticles,
                    mediaNotedArticles: mediaNotedArticles
                }
            );
            SciClipsSearchModule.performSearch();
        }
    };
    $('#search-button').click(function () {
        search();
    });
    $('.sci-clips-search-input').keydown(function (event) {
        if(event.keyCode === 13){
            search();
        }
    });
    $('#next-25-search-results').click(function () {
        SciClipsSearchModule.getNext25Results();
        SciClipsSearchModule.performSearch();
    });
    $('#prev-25-search-results').click(function () {
        SciClipsSearchModule.getPrev25Results();
        SciClipsSearchModule.performSearch();
    });
});

