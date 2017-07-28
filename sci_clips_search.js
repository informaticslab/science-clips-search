'use strict';
var SciClipsSearchModule = (function(){
    var template = _.template(
        '<li>'
        + '<a target="_blank" href="<%=d.url%>"><%=d.short_title%></a><br/>'
        + '<% if(d.author){print(d.author +"<br/>")}%>'
        + '<% if(d.secondary_title){print(d.secondary_title +". ")}%><% if(d.year){print(d.year +" ")}%><% if(d.date){print(d.date +";")}%><% if(d.volume){print(d.volume +":")}%><% if(d.pages){print(d.pages +".")}%>' + '<% if(d.custom_8){ print(SciClipsSearchModule.linkToIssue(d.custom_8))}%>'
        + '<br/>'
        + '<% if(d.custom_2){print(d.custom_2 +"<br/>")}%>'
        + '<% if(d.custom_1){print(d.custom_1 +"<br/>")}%>'
        + '<% if(d.abstract){%>'
        + '<a id="abstractToggle<%=d.record_number%>" href="javascript:SciClipsSearchModule.toggleAbstract(<%=d.record_number%>)" aria-expanded="false">[+]Abstract</a>'
        + '<div id="abstractContent<%=d.record_number%>" style="display: none" aria-hidden="true"><%=d.abstract%></div>'
        + '<%}else{print("[No abstract]")}%>'
        + '</li>'
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
            value: false
        },
        cdcVitalSigns: {
            queryString: 'CDC Vital Signs',
            value: false
        },
        cdcGrandRounds: {
            queryString: 'CDC Grand Rounds',
            value: false
        },
        keyArticles: {
            queryString: 'Key Scientific Articles in Featured Topic Areas',
            value: false
        },
        mediaNotedArticles: {
            queryString: 'Public Health Articles Noted in the Media',
            value: false
        }
    };
    var searching = false;
    var offset = 0;
    var limit = 25;
    var currentQueryRecordCount = 0;
    var baseSearchURL = 'https://data.cdc.gov/resource/d8c6-ee8v.json?';
    var searchParamsString;
    var searchURL;
    var loadingSpinner = $('#loading-spinner');
    var searchResultsContainer = $('#search-results-container');
    var searchResultsSummary = $('#results-summary-text');
    var searchResultsControlPanel = $('#search-results-control-panel');
    var advancedSearchIsDisplayed = false;
    var appToken = "1XGlTdFOCn5DilvbOnya6Je0P";
    var buttons = {
        search: $('#search-button'),
        prevResults: $('#prev-search-results'),
        nextResults: $('#next-search-results'),
        modifySearch: $('#modify-search'),
        clearSearchForm: $('#clear-search-form-button')
    };

    var toggleAbstract = function(id) {
        var abstractToggle = $('#abstractToggle' +id);
        var toggleText = abstractToggle.html();
        var abstractContent = $('#abstractContent' +id);
        var showAbstractText = "[+]Abstract";
        var hideAbstractText = "[-]Abstract";
        var isExpanded = toggleText !== showAbstractText;

        abstractToggle.html(isExpanded ? showAbstractText : hideAbstractText);
        abstractContent.toggle();
        abstractToggle.attr('aria-expanded', !isExpanded);
        abstractContent.attr('aria-hidden', isExpanded);
    };

    var resetSearch = function () {
        //searchText = "reset";
        offset = 0;
        currentQueryRecordCount = 0;
        searchResultsControlPanel.hide();
        searchResultsContainer.html("");
        searchResultsSummary.html("");
    };

    var displaySearchResults = function(data) {
        var resultsToDisplay = "";
        searchResultsContainer.html("");
        if(data.length > 0) {
            searchResultsSummary.html("Displaying results " +(offset + 1) +" to " +(offset + data.length) +" of " +currentQueryRecordCount);
        }

        searchResultsContainer.show(data.length > 0);


        if(offset === 0) {
            if(data.length > 0) {
                for(var i = 0; i < data.length; i++) {
                    resultsToDisplay += template({d: data[i]})
                }
            } else {
                searchResultsSummary.html("No results found.");
            }
        } else {
            if(data.length > 0) {
                for(var i = 0; i < data.length; i++) {
                    resultsToDisplay += template({d: data[i]});
                }
            }
        }
        searchResultsContainer.append(resultsToDisplay);
        finishSearch();
    };

    var manageButtons = function () {
        if(searching) {
            buttons.search.addClass('disabled').attr('disabled', 'disabled');
            buttons.prevResults.addClass('disabled').attr('disabled', 'disabled');
            buttons.nextResults.addClass('disabled').attr('disabled', 'disabled');
            buttons.modifySearch.addClass('disabled').attr('disabled', 'disabled');
            buttons.clearSearchForm.addClass('disabled').attr('disabled', 'disabled');
        } else {
            if(currentQueryRecordCount - offset > limit) buttons.nextResults.removeClass('disabled').removeAttr('disabled');
            if(offset > 0) buttons.prevResults.removeClass('disabled').removeAttr('disabled');
            buttons.search.removeClass('disabled').removeAttr('disabled');
            buttons.modifySearch.removeClass('disabled').removeAttr('disabled');
            buttons.clearSearchForm.removeClass('disabled').removeAttr('disabled');
        }
    };

    var displayErrorMessage = function() {
        searchResultsSummary.html("An error has occurred.");
        finishSearch();
    };

    var prepareForSearch = function () {
        searching = true;
        searchResultsSummary.html('<i id="loading-spinner" class="spinner icon-spinner icon-spin" role="status"><p class="screen-reader-only">loading</p></i>');
        searchResultsSummary.attr('aria-busy', true);
        manageButtons();
    };

    var finishSearch = function () {
        searching = false;
        searchResultsSummary.attr('aria-busy', false);
        searchResultsContainer.slideDown(100);
        searchResultsControlPanel.show();
        manageButtons();
    };

    var performSearch = function() {
        prepareForSearch();
        var orderString = '%20&$ORDER=record_number%20DESC';
        var limitString = '%20&$LIMIT=' + limit;
        var offsetString = '%20&$OFFSET=' + offset;

        searchURL = baseSearchURL + generateSearchParamsString() +orderString +limitString +offsetString;

        var countURL = baseSearchURL + "$SELECT=SUM(CASE(" + searchParamsString + ",%201,%20FALSE,%200))%20AS%20count";

        if (offset === 0) {
            $.ajax({
                type: 'GET',
                url: countURL,
                dataType: 'json',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("X-APP-TOKEN", appToken);
                }
            })
                .success(function (data) {
                    currentQueryRecordCount = data[0].count;
                    $.ajax({
                        type: 'GET',
                        url: searchURL,
                        dataType: 'json',
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader("X-APP-TOKEN", appToken);
                        }
                    })
                        .success(function (data) {
                            loadingSpinner.toggle();
                            displaySearchResults(data);
                        })
                        .fail(function () {
                            loadingSpinner.toggle();
                            displayErrorMessage();
                        });
                })
                .fail(function () {
                    loadingSpinner.toggle();
                    displayErrorMessage();
                });
        } else {
            $.ajax({
                type: 'GET',
                url: searchURL,
                dataType: 'json',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("X-APP-TOKEN", appToken);
                }
            })
                .success(function (data) {
                    loadingSpinner.toggle();
                    displaySearchResults(data);
                })
                .fail(function () {
                    loadingSpinner.toggle();
                    displayErrorMessage();
                })
        }
    };

    var generateSearchParamsString = function () {
        searchParamsString = '(UPPER(abstract)%20LIKE%20%27%25' + titleAndAbstractSearchText.toUpperCase() + '%25%27'
            + '%20OR%20UPPER(short_title)%20LIKE%20%27%25' + titleAndAbstractSearchText.toUpperCase() + '%25%27)'
            + (authorSearchText.length > 0 ? '%20AND%20UPPER(author)%20LIKE%20%27%25' + authorSearchText.toUpperCase() + '%25%27' : '')
            + (publicationTitle.length > 0 ? '%20AND%20UPPER(secondary_title)%20LIKE%20%27%25' + publicationTitle.toUpperCase() + '%25%27' : '')
            + (publicationYearFrom.length > 0 ? '%20AND%20year>=' +publicationYearFrom : '')
            + (publicationYearTo.length > 0 ? '%20AND%20year<=' +publicationYearTo : '')
            + (topicHeadingSearchText.length > 0 ? '%20AND%20UPPER(custom_2)%20LIKE%20%27%25' + topicHeadingSearchText.toUpperCase() +'%25%27' : '')
            + generateArticleTypeQuery();

        return '$WHERE=' + searchParamsString;
    };

    var generateArticleTypeQuery = function () {
        var articleTypeQueryString = '';
        var selectedTypes = _.filter(articleType, function(type){return type.value === true;});
        if(selectedTypes.length === 0) {
            return articleTypeQueryString;
        }
        for(var i = 0; i < _.size(selectedTypes); i++) {
            articleTypeQueryString += i !==0 ? '%20OR%20' : '' ;
            articleTypeQueryString += 'custom_1=%27' +selectedTypes[i].queryString +'%27';
        }
        return '%20AND(' +articleTypeQueryString +')';
    };

    var getNextResults =  function () {
        searchResultsSummary.html("");
        offset = offset + limit;
        performSearch();
    };

    var getPrevResults = function () {
        searchResultsSummary.html("");
        offset = offset - limit;
        performSearch();
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
        articleType.cdcGrandRounds.value = text.cdcGrandRounds;
        articleType.keyArticles.value = text.keyArticles;
        articleType.mediaNotedArticles.value = text.mediaNotedArticles;
    };

    var toggleAdvancedSearch = function () {
        advancedSearchIsDisplayed = !advancedSearchIsDisplayed;
        $('#advanced-search-toggle-icon').html(advancedSearchIsDisplayed ? '-' : '+');
        $('#advanced-search-toggle').attr('aria-expanded', advancedSearchIsDisplayed);
        $('.sci-clips-advanced-search').toggle().attr('aria-hidden', !advancedSearchIsDisplayed);

    };

    return {
        setSearchText: setSearchText,
        getSearchText: getSearchText,
        resetSearch: resetSearch,
        performSearch: performSearch,
        getNextResults: getNextResults,
        getPrevResults: getPrevResults,
        linkToIssue: linkToIssue,
        toggleAbstract: toggleAbstract,
        toggleAdvancedSearch: toggleAdvancedSearch,
        buttons: buttons,
        limit: limit,
        searchResultsSummary: searchResultsSummary
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
        var cdcGrandRounds = $('#article_type_cdc_grand_rounds').prop('checked');
        var keyArticles = $('#article_type_key_articles').prop('checked');
        var mediaNotedArticles = $('#article_type_media_noted_articles').prop('checked');



        if(titleAndAbstractSearchText !== searchText.titleAndAbstractSearchText
            || authorSearchText !== searchText.authorSearchText
            || publicationTitle !== searchText.publicationTitle
            || publicationYearTo!== searchText.publicationYearTo
            || publicationYearFrom !== searchText.publicationYearFrom
            || cdcAuthored !== searchText.articleType.cdcAuthored.value
            || cdcVitalSigns !== searchText.articleType.cdcVitalSigns.value
            || cdcGrandRounds !== searchText.articleType.cdcGrandRounds.value
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
                    cdcGrandRounds: cdcGrandRounds,
                    keyArticles: keyArticles,
                    mediaNotedArticles: mediaNotedArticles
                }
            );
            SciClipsSearchModule.performSearch();
        }
    };
    SciClipsSearchModule.buttons.search.on('click', function () {
        if(!SciClipsSearchModule.buttons.search.attr('disabled')) {
            search();
            var target = $('#results-summary-text');
            $('html,body').animate({
                scrollTop: target.offset().top
            }, 100, function () {
                target.focus();
            });
        }
    }).on('touchend', function(e) {
        e.preventDefault();
        e.target.click();
    });
    $('.sci-clips-search-input').keydown(function (event) {
        if(event.keyCode === 13 && !SciClipsSearchModule.buttons.search.attr('disabled')){
            search();
            var target = $('#results-summary-text');
            $('html,body').animate({
                scrollTop: target.offset().top
            }, 100, function() {
                target.focus();
            });
        }
    });
    SciClipsSearchModule.buttons.nextResults.html("Next " +SciClipsSearchModule.limit)
        .on('click', function () {
            if(!SciClipsSearchModule.buttons.nextResults.attr('disabled')) {
                var target = $('#results-summary-text');
                $('#search-results-container').slideUp(100, function () {
                    $('html,body').animate({
                        scrollTop: target.offset().top
                    }, 0);
                    target.focus();
                    SciClipsSearchModule.getNextResults();
                });
            }
        }).on('touchend', function (e) {
            e.preventDefault();
            e.target.click();
        });
    SciClipsSearchModule.buttons.prevResults.html("Previous " +SciClipsSearchModule.limit)
        .on('click', function () {
            if(!SciClipsSearchModule.buttons.prevResults.attr('disabled')) {
                var target = $('#results-summary-text');
                $('#search-results-container').slideUp(100, function () {
                    $('html,body').animate({
                        scrollTop: target.offset().top
                    }, 0);
                    target.focus();
                    SciClipsSearchModule.getPrevResults();
                });
            }
        }).on('touchend', function (e) {
            e.preventDefault();
            e.target.click();
        });
    SciClipsSearchModule.buttons.modifySearch.on('click', function () {
        if(!SciClipsSearchModule.buttons.modifySearch.attr('disabled')) {
            var target = $('#search-text');
            $('html,body').animate({
                scrollTop: target.offset().top
            }, 100, function () {
                target.focus();
            });
        }
    }).on('touchend', function(e) {
        e.preventDefault();
        e.target.click();
    });
});

