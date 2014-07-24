/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var translation = (function() {
    
    var translation = {};
    var initialised = false;
    
    return function(pageId) {     
        
        // Methods
        
        var translatePage = function() {        

            $('#' + pageId + ' .multiLanguage').each(function() {

                $(this).text(translateText($.trim($(this).text()), pageId));
            });    
        };

        var translateText = function(text) {

            var testLanguageOn = (localStorage.getItem('Portuguese') === 'on');  

            if (!testLanguageOn && navigator.language.indexOf('en') !== -1)
                return text;

            pageId = pageId || $.mobile.activePage.attr('id');

            var translationObject = translation && translation[text];
            var translatedText = translationObject && translationObject[testLanguageOn ? 'pt' : navigator.language];

            return translatedText || text;        
        };

        var translateButton = function(selector, caption) {

            $(selector + ' .ui-btn-text').text(translateText(caption));        
        };        
        
        var safeExecute = function(fn) {
            
            var that = this;
            
            initialised ? fn() : setTimeout(function() {
                that.safeExecute(fn);
            }, 10);
        };
        
        // Initialisation
        
        pageId = pageId || $.mobile.activePage.attr('id');        

        if ($.isEmptyObject(translation)) {

            var fileName = 'translations/' + pageId + '.json';

            $.getJSON(fileName, function(translationJSON) {

                translation = translationJSON;
                initialised = true;
                translatePage();

            }).fail(function() {

                initialised = true;
                console.log('File ' + fileName + ' doesn\'t exist');
            });

        } else {

            translatePage();
        }                

        // Object 

        var translationObject = {};

        translationObject.translateText = translateText;
        translationObject.translateButton = translateButton; 
        translationObject.safeExecute = safeExecute;
        
        return translationObject;
    };    
})();