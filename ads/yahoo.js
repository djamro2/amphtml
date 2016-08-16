/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
* @param {!Window} global
* @param {!Object} data
*/

import {validateDataExists} from '../3p/3p';

const MIN_VIEWED_TIME = 1000;

export function yahoo(global, data) {
	var beaconTimeout = undefined,
		beaconFired = false,
		beacons = [];

	if (data && data.beacon) {
		beacons.push(data.beacon);
	}
	if (data && data.imprtrackingurl) {
		beacons.push(data.imprtrackingurl);
	}

	var createNewImageElements = function() {
		beacons.forEach(function(beacon) {
			var img = global.document.createElement('img');
			img.setAttribute('src', beacon);
			img.setAttribute('style', 'display: none;');
			global.document.body.appendChild(img);
		});
	};

	// returns an object of properties about the parent iframe (the one given by amp-ad)
	var getIframeProperties = function() {
		var result = {
			width: 0,
			height: 0
		};

		result.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
		result.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

		return result;
	};
	
	var fireBeaconAfterViewedTime = function(cancel) {
		if (beaconFired) {
			return;
		}

		if (cancel) {
			clearTimeout(beaconTimeout);
			beaconTimeout = undefined;
		} else if (!beaconTimeout) {
			beaconTimeout = setTimeout(function(){
				// create images for all beacons in array
				createNewImageElements();
				beaconFired = true;
			}, MIN_VIEWED_TIME);
		}
	};

	// when the ad element is percentInView in the viewport, fire beacons provided
	var trackAdElement = function(percentInView=100) {
		// TODO: percentInView is not yet implemented

		global.context.observeIntersection((newrequest) => {
    		newrequest.forEach(function(d) {
    			if (beaconFired) {
    				return;
    			}

      			if ((d.intersectionRect.height > 0) && !beaconTimeout) {
      				// if in viewport and no setTimeout running
      				fireBeaconAfterViewedTime();
      			} else if ((d.intersectionRect.height === 0) && beaconTimeout) {
      				// if out of viewport and setTimeout running
      				fireBeaconAfterViewedTime(true);
      			}
      		});
      	});
	};

	// these are the styles that should be present in any rendered UI (should be in it's own page at some point)
	var getGeneralStyles = function() {
		var css = '';

		css += '.amp-ad-gemini {position: relative; }';
		css += '.amp-ad-gemini {font: 13px/1.25 "Helvetica Neue", Helvetica, Arial, sans-serif}';

		css += '.ad-feedback-button {position: absolute; top: 5px; right: 5px;}';
		css += '.ad-feedback-button {background-color: #aaa; display: flex; align-items: center;}';
		css += '.ad-feedback-button {justify-content: center; color: white; cursor: pointer; }';
		css += '.ad-feedback-button {width: 15px; height: 14px; }'

		css += '.gemini-ad-title {margin: 4px 0; font-size: 13px; font-weight: 400; } ';

		css += '.ad-provider {display: block; margin: 0; padding: 3px 3px 3px 0; color: #96989f; }';
		css += '.ad-provider {font-weight: 300; font-size: 11px; line-height: 14px; }';

		return css;
	};

	// used when rendering the UI. This stylesheet is used in the amp-ad iframe
	// extraStyles is a String
	var renderStyleSheet = function(extraStyles) {
		// get css as a string (can be put in a seperate file in the future)
		var css = '';
		css += getGeneralStyles();
		if (extraStyles) {
			css += extraStyles;
		}

		// add css to document
		var head = document.getElementsByTagName('head')[0];
		var style = document.createElement('style');
		style.setAttribute('type', 'text/css');
		style.appendChild(document.createTextNode(css));
		head.appendChild(style);
	};

	// create the sidekick type UI, handle the rendering of the ad in the current iframe
	var renderGeminiThumbnail = function() {
		var div = document.createElement('div'),
			iframeInfo = getIframeProperties(),
			innerHtml = '',
			extraStyles = '';

		if (data.img) {
			innerHtml += ('<img class="gemini-img" src="' + data.img + '" alt="' + data.title + '" />');
			innerHtml += ('<span class="ad-feedback-button">x</span>');

			extraStyles += ('.gemini-img {max-width: ' + iframeInfo.width + 'px; }');
		}

		if (data.title) {
			innerHtml += ('<span class="gemini-ad-title">' + data.title + '</span>');
		}

		if (data.provider) {
			innerHtml += ('<span class="ad-provider">' + data.provider + '</span>');
		}

		// render the style sheet with any extra styles set
		renderStyleSheet(extraStyles);

		div.innerHTML = innerHtml;
		div.setAttribute('class', 'amp-ad-gemini');
		document.body.appendChild(div);
	};

	// create the index page type UI, render ad in current DOM
	var renderGeminiCard = function() {
		console.log('RENDERING GEMINI CARD (todo)');
	};

	if (data && data.adtype === "gemini") {
		validateDataExists(data, ['beacon']);

		// is a gemini ad, may provide UI through template, or just provide tracking
		if (!data.template) {
			trackAdElement(100);
		} else {
			switch(data.template) {
				case 'thumbnail':
					renderGeminiThumbnail();
					trackAdElement(100);
					break;
				case 'card':
					renderGeminiCard();
					trackAdElement(75);
				default:
					console.error('Yahoo amp-ad - Not a valid template :/');
			}
		}
	} else { /* display ad */
		validateDataExists(data, ['src']);

		// create the iframe within amp-ad's iframe (iframeception)
		var ad = document.createElement('iframe');
		ad.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
		ad.setAttribute('layout', 'fixed');
		ad.setAttribute('scrolling', 'no');
		ad.setAttribute('frameborder', '0');
		ad.setAttribute('src', data.src);
		ad.setAttribute('style', 'height: 100vh; width: 100vw; border: none;');

		// document is amp-ad's iframe at this point
		document.body.appendChild(ad);
	}
}
