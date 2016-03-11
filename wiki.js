// These are all the different things we can ask wikipedia about for the prop:
// 'text|langlinks|categories|links|templates|images|
//  externallinks|sections|revid|displaytitle|iwlinks|properties'

function fetchIntro(text) {
	var API = new MediaWikiJS('https://en.wikipedia.org');

	API.send({action: 'parse', page: text, section: "0", prop: 'text'},
		function (data) {
			'use strict';
			
			// Extract the text
			var rawText = data.parse.text['*']

			// Find position of first <p>
			var frontIndex = rawText.search("<p>");

			// Find position of last <p>
			var endIndex = rawText.lastIndexOf("</p>");
			
			// Remove all garble stuff before the first <p> and
			// remove all garble stuff after the first <!-- (including it)
			var trimmedText = rawText.slice(frontIndex, endIndex + 4);
			
			// Fix so all links redirect to wikipedia correctly
			trimmedText = trimmedText.replace(/href="/g,'href="https://en.wikipedia.org');
			
			// Replace this line with a call to a function that
			// updates the "introduction info"-window
			console.log(trimmedText);
		}
	);
}