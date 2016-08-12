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
			global.document.body.appendChild(img);
		});
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

	if (data && data.adtype === "gemini") {
		validateDataExists(data, ['beacon']);
		global.context.observeIntersection(function(newrequest) {
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
