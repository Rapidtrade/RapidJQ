/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var translation = (function() {
    
    return function(pageId) {  
        
        var translation = {};
        var initialised = false;        
        
        // Methods
        
        var translatePage = function() {        

            $('#' + pageId + ' .multiLanguage').each(function() {

                $(this).text(translateText($.trim($(this).text())));
            });    
        };

        var translateText = function(text) {

//            var testLanguageOn = (localStorage.getItem('Portuguese') === 'on');  

//            if (/*!testLanguageOn &&*/ navigator.language.indexOf('en') !== -1)
//                return text;

            var translationObject = translation && translation[text];
            var translatedText = translationObject && translationObject[/*testLanguageOn ? 'pt' :*/ /*navigator.language*/ 'pt'];

            return translatedText || text;        
        };

        var translateButton = function(selector, text) {

            $(selector + ' .ui-btn-text').text(translateText(text));        
        };
        
        var translateRadioButton = function(radioId, text) {
            
            $('label[for="' + radioId + '"] span.ui-btn-text').text(translateText(text));
        };
        
        var safeExecute = function(fn) {            
            
            var that = this;
            
            initialised ? fn() : setTimeout(function() {
                
                console.log(pageId + ': loading translation...');
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
        translationObject.translateRadioButton = translateRadioButton; 
        translationObject.safeExecute = safeExecute;
        
        return translationObject;
    };    
})();