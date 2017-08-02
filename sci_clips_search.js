'use strict';
var SciClipsSearchModule = (function(){
    var template = _.template(
        '<li>'
        + '<%if(d.accession_number){%><a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/<%=d.accession_number%>/?otool=cdciclib">'
        + '<%=d.short_title%></a><br/>'
        + '<%} else if(d.doi){%><a target="_blank" href="http://dx.doi.org/<%=d.doi%>"><%=d.short_title%></a><br/>'
        + '<%} else {print(d.short_title +"<br/>")}%>'
        + '<% if(d.doi){ %>'
        + '<div class="altmetric-embed" style="float: right" data-badge-type="donut" data-badge-popover="left" '
        + 'data-doi="<%=d.doi%>"></div>'
        + '<%}%>'
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

    //Search input values - text
    var titleAndAbstractSearchText;
    var authorSearchText;
    var publicationTitle;
    var publicationYearFrom;
    var publicationYearTo;
    var topicHeadingSearchText;

    //Search input values - article type checkboxes
    var articleType = {
        cdcAuthored: {
            queryString: 'CDC Authored Publications',
            value: null
        },
        cdcVitalSigns: {
            queryString: 'CDC Vital Signs',
            value: null
        },
        cdcGrandRounds: {
            queryString: 'CDC Grand Rounds',
            value: null
        },
        keyArticles: {
            queryString: 'Key Scientific Articles in Featured Topic Areas',
            value: null
        },
        mediaNotedArticles: {
            queryString: 'Public Health Articles Noted in the Media',
            value: null
        }
    };

    var searching = false;
    var offset = 0;
    var limit = 25;
    var currentQueryRecordCount = 0;
    var baseSearchURL = 'https://data.cdc.gov/resource/d8c6-ee8v.json?';
    var searchParamsString;
    var searchURL;
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

    //id is record_number field in dataset. Search result template appends id to 'abstractToggle' and 'abstractContent'
    //for use in this function.
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
        _altmetric_embed_init();
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
                            displaySearchResults(data);
                        })
                        .fail(function () {
                            displayErrorMessage();
                        });
                })
                .fail(function () {
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
                    displaySearchResults(data);
                })
                .fail(function () {
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
            + generateArticleTypeQueryString();

        return '$WHERE=' + searchParamsString;
    };

    //Creates query string from user selections in the article type checkboxes
    var generateArticleTypeQueryString = function () {
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

    //Create link to Science Clips issue by concatenating vol and issue pulled from custom_8 field in dataset.
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

    //Set value for each input
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

    //Entry point for search. Check if stored values match input from fields.
    //If any field has changed, replace values and start new search.
    var search = function () {
        var titleAndAbstractSearchInput = $('#search-text').val();
        var authorSearchInput = $('#author-text').val();
        var topicHeadingSearchInput = $('#topic-heading-text').val();
        var publicationTitleInput = $('#publication-title').val();
        var publicationYearToInput = $('#publication-year-to').val();
        var publicationYearFromInput = $('#publication-year-from').val();
        var cdcAuthoredInput = $('#article_type_cdc_authored').prop('checked');
        var cdcVitalSignsInput = $('#article_type_cdc_vital_signs').prop('checked');
        var cdcGrandRoundsInput = $('#article_type_cdc_grand_rounds').prop('checked');
        var keyArticlesInput = $('#article_type_key_articles').prop('checked');
        var mediaNotedArticlesInput = $('#article_type_media_noted_articles').prop('checked');

        if (titleAndAbstractSearchInput !== titleAndAbstractSearchText
            || authorSearchInput !== authorSearchText
            || publicationTitleInput !== publicationTitle
            || publicationYearToInput !== publicationYearTo
            || publicationYearFromInput !== publicationYearFrom
            || cdcAuthoredInput !== articleType.cdcAuthored.value
            || cdcVitalSignsInput !== articleType.cdcVitalSigns.value
            || cdcGrandRoundsInput !== articleType.cdcGrandRounds.value
            || keyArticlesInput !== articleType.keyArticles.value
            || mediaNotedArticlesInput !== articleType.mediaNotedArticles.value
            || topicHeadingSearchInput !== topicHeadingSearchText) {

            resetSearch();
            setSearchText({
                titleAndAbstractSearchText: titleAndAbstractSearchInput,
                authorSearchText: authorSearchInput,
                publicationTitle: publicationTitleInput,
                publicationYearTo: publicationYearToInput,
                publicationYearFrom: publicationYearFromInput,
                topicHeadingSearchText: topicHeadingSearchInput,
                cdcAuthored: cdcAuthoredInput,
                cdcVitalSigns: cdcVitalSignsInput,
                cdcGrandRounds: cdcGrandRoundsInput,
                keyArticles: keyArticlesInput,
                mediaNotedArticles: mediaNotedArticlesInput
            });
            performSearch();
        }
    };

    //Click/Touch handlers. focus() calls are placed here because webkit ignores focus() calls outside of click handlers.
    var setupHandlers = function () {
        buttons.search.on('click', function () {
            if(!buttons.search.attr('disabled')) {
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
            if(event.keyCode === 13 && !buttons.search.attr('disabled')){
                search();
                var target = $('#results-summary-text');
                $('html,body').animate({
                    scrollTop: target.offset().top
                }, 100, function() {
                    target.focus();
                });
            }
        });
        buttons.nextResults.html("Next " +limit)
            .on('click', function () {
                if(!buttons.nextResults.attr('disabled')) {
                    var target = $('#results-summary-text');
                    $('#search-results-container').slideUp(100, function () {
                        $('html,body').animate({
                            scrollTop: target.offset().top
                        }, 0);
                        target.focus();
                        getNextResults();
                    });
                }
            }).on('touchend', function (e) {
            e.preventDefault();
            e.target.click();
        });
        buttons.prevResults.html("Previous " +limit)
            .on('click', function () {
                if(!buttons.prevResults.attr('disabled')) {
                    var target = $('#results-summary-text');
                    $('#search-results-container').slideUp(100, function () {
                        $('html,body').animate({
                            scrollTop: target.offset().top
                        }, 0);
                        target.focus();
                        getPrevResults();
                    });
                }
            }).on('touchend', function (e) {
            e.preventDefault();
            e.target.click();
        });
        buttons.modifySearch.on('click', function () {
            if(!buttons.modifySearch.attr('disabled')) {
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
    };

    var init = function () {
        $('#science-clips-search-form').trigger('reset');
        setupHandlers();
    };

    return {
        init: init,

        //These functions are used in the results template
        linkToIssue: linkToIssue,
        toggleAbstract: toggleAbstract,
        toggleAdvancedSearch: toggleAdvancedSearch
    };
})();


$(document).ready(function () {
    SciClipsSearchModule.init();
});

