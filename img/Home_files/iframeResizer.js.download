/*
 * File: iframeResizer.js
 * Desc: Force iframes to size to content.
 * Requires: iframeResizer.contentWindow.js to be loaded into the target frame.
 * Doc: https://github.com/davidjbradshaw/iframe-resizer
 * Author: David J. Bradshaw - dave@bradshaw.net
 * Contributor: Jure Mav - jure.mav@gmail.com
 * Contributor: Reed Dadoune - reed@dadoune.com
 */

// eslint-disable-next-line sonarjs/cognitive-complexity, no-shadow-restricted-names
(function(undefined) {
	if (typeof window === 'undefined') return; // don't run for server side render

	let count = 0;
	let logEnabled = false;
	let hiddenCheckEnabled = false;
	const msgHeader = 'message';
	const msgHeaderLen = msgHeader.length;
	const msgId = '[iFrameSizer]'; // Must match iframe msg ID
	const msgIdLen = msgId.length;
	let pagePosition = null;
	let { requestAnimationFrame } = window;
	const resetRequiredMethods = {
		max: 1,
		scroll: 1,
		bodyScroll: 1,
		documentElementScroll: 1
	};
	const settings = {};
	let timer = null;
	const defaults = {
		autoResize: true,
		bodyBackground: null,
		bodyMargin: null,
		bodyMarginV1: 8,
		bodyPadding: null,
		checkOrigin: true,
		inPageLinks: false,
		enablePublicMethods: true,
		heightCalculationMethod: 'bodyOffset',
		id: 'iFrameResizer',
		interval: 32,
		log: false,
		maxHeight: Infinity,
		maxWidth: Infinity,
		minHeight: 0,
		minWidth: 0,
		resizeFrom: 'parent',
		scrolling: false,
		sizeHeight: true,
		sizeWidth: false,
		warningTimeout: 5000,
		tolerance: 0,
		widthCalculationMethod: 'scroll',
		onClose() {
			return true;
		},
		onClosed() {},
		onInit() {},
		onMessage() {
			warn('onMessage function not defined');
		},
		onResized() {},
		onScroll() {
			return true;
		}
	};

	function getMutationObserver() {
		return (
			window.MutationObserver ||
			window.WebKitMutationObserver ||
			window.MozMutationObserver
		);
	}

	function addEventListener(el, evt, func) {
		el.addEventListener(evt, func, false);
	}

	function removeEventListener(el, evt, func) {
		el.removeEventListener(evt, func, false);
	}

	function setupRequestAnimationFrame() {
		const vendors = ['moz', 'webkit', 'o', 'ms'];
		let x;

		// Remove vendor prefixing if prefixed and break early if not
		for (x = 0; x < vendors.length && !requestAnimationFrame; x += 1) {
			requestAnimationFrame = window[`${vendors[x]}RequestAnimationFrame`];
		}

		if (!requestAnimationFrame) {
			log('setup', 'RequestAnimationFrame not supported');
		} else {
			// Firefox extension content-scripts have a globalThis object that is not the same as window.
			// Binding `requestAnimationFrame` to window allows the function to work and prevents errors
			// being thrown when run in that context, and should be a no-op in every other context.
			requestAnimationFrame = requestAnimationFrame.bind(window);
		}
	}

	function getMyID(iframeId) {
		let retStr = `Host page: ${iframeId}`;

		if (window.top !== window.self) {
			if (window.parentIFrame && window.parentIFrame.getId) {
				retStr = `${window.parentIFrame.getId()}: ${iframeId}`;
			} else {
				retStr = `Nested host page: ${iframeId}`;
			}
		}

		return retStr;
	}

	function formatLogHeader(iframeId) {
		return `${msgId}[${getMyID(iframeId)}]`;
	}

	function isLogEnabled(iframeId) {
		return settings[iframeId] ? settings[iframeId].log : logEnabled;
	}

	function log(iframeId, msg) {
		output('log', iframeId, msg, isLogEnabled(iframeId));
	}

	function info(iframeId, msg) {
		output('info', iframeId, msg, isLogEnabled(iframeId));
	}

	function warn(iframeId, msg) {
		output('warn', iframeId, msg, true);
	}

	function output(type, iframeId, msg, enabled) {
		if (enabled === true && typeof window.console === 'object') {
			// eslint-disable-next-line no-console
			console[type](formatLogHeader(iframeId), msg);
		}
	}

	function iFrameListener(event) {
		function resizeIFrame() {
			function resize() {
				setSize(messageData);
				setPagePosition(iframeId);
				on('onResized', messageData);
			}

			ensureInRange('Height');
			ensureInRange('Width');

			syncResize(resize, messageData, 'init');
		}

		function processMsg() {
			const data = msg.substr(msgIdLen).split(':');
			const height = data[1] ? parseInt(data[1], 10) : 0;
			const iframe = settings[data[0]] && settings[data[0]].iframe;
			const compStyle = getComputedStyle(iframe);

			return {
				iframe,
				id: data[0],
				height: height + getPaddingEnds(compStyle) + getBorderEnds(compStyle),
				width: data[2],
				type: data[3]
			};
		}

		function getPaddingEnds(compStyle) {
			if (compStyle.boxSizing !== 'border-box') {
				return 0;
			}
			const top = compStyle.paddingTop ? parseInt(compStyle.paddingTop, 10) : 0;
			const bot = compStyle.paddingBottom
				? parseInt(compStyle.paddingBottom, 10)
				: 0;
			return top + bot;
		}

		function getBorderEnds(compStyle) {
			if (compStyle.boxSizing !== 'border-box') {
				return 0;
			}
			const top = compStyle.borderTopWidth
				? parseInt(compStyle.borderTopWidth, 10)
				: 0;
			const bot = compStyle.borderBottomWidth
				? parseInt(compStyle.borderBottomWidth, 10)
				: 0;
			return top + bot;
		}

		function ensureInRange(Dimension) {
			const max = Number(settings[iframeId][`max${Dimension}`]);
			const min = Number(settings[iframeId][`min${Dimension}`]);
			const dimension = Dimension.toLowerCase();
			let size = Number(messageData[dimension]);

			log(iframeId, `Checking ${dimension} is in range ${min}-${max}`);

			if (size < min) {
				size = min;
				log(iframeId, `Set ${dimension} to min value`);
			}

			if (size > max) {
				size = max;
				log(iframeId, `Set ${dimension} to max value`);
			}

			messageData[dimension] = `${size}`;
		}

		function isMessageFromIFrame() {
			function checkAllowedOrigin() {
				function checkList() {
					let i = 0;
					let retCode = false;

					log(
						iframeId,
						`Checking connection is from allowed list of origins: ${checkOrigin}`
					);

					for (; i < checkOrigin.length; i++) {
						if (checkOrigin[i] === origin) {
							retCode = true;
							break;
						}
					}
					return retCode;
				}

				function checkSingle() {
					const remoteHost =
						settings[iframeId] && settings[iframeId].remoteHost;
					log(iframeId, `Checking connection is from: ${remoteHost}`);
					return origin === remoteHost;
				}

				return checkOrigin.constructor === Array ? checkList() : checkSingle();
			}

			var { origin } = event;
			var checkOrigin = settings[iframeId] && settings[iframeId].checkOrigin;

			if (checkOrigin && `${origin}` !== 'null' && !checkAllowedOrigin()) {
				throw new Error(
					`Unexpected message received from: ${origin} for ${messageData.iframe.id}. Message was: ${event.data}. This error can be disabled by setting the checkOrigin: false option or by providing of array of trusted domains.`
				);
			}

			return true;
		}

		function isMessageForUs() {
			return (
				msgId === `${msg}`.substr(0, msgIdLen) &&
				msg.substr(msgIdLen).split(':')[0] in settings
			); // ''+Protects against non-string msg
		}

		function isMessageFromMetaParent() {
			// Test if this message is from a parent above us. This is an ugly test, however, updating
			// the message format would break backwards compatibity.
			const retCode = messageData.type in { true: 1, false: 1, undefined: 1 };

			if (retCode) {
				log(iframeId, 'Ignoring init message from meta parent page');
			}

			return retCode;
		}

		function getMsgBody(offset) {
			return msg.substr(msg.indexOf(':') + msgHeaderLen + offset);
		}

		function forwardMsgFromIFrame(msgBody) {
			log(
				iframeId,
				`onMessage passed: {iframe: ${messageData.iframe.id}, message: ${msgBody}}`
			);
			on('onMessage', {
				iframe: messageData.iframe,
				message: JSON.parse(msgBody)
			});
			log(iframeId, '--');
		}

		function getPageInfo() {
			const bodyPosition = document.body.getBoundingClientRect();
			const iFramePosition = messageData.iframe.getBoundingClientRect();

			return JSON.stringify({
				iframeHeight: iFramePosition.height,
				iframeWidth: iFramePosition.width,
				clientHeight: Math.max(
					document.documentElement.clientHeight,
					window.innerHeight || 0
				),
				clientWidth: Math.max(
					document.documentElement.clientWidth,
					window.innerWidth || 0
				),
				offsetTop: parseInt(iFramePosition.top - bodyPosition.top, 10),
				offsetLeft: parseInt(iFramePosition.left - bodyPosition.left, 10),
				scrollTop: window.pageYOffset,
				scrollLeft: window.pageXOffset,
				documentHeight: document.documentElement.clientHeight,
				documentWidth: document.documentElement.clientWidth,
				windowHeight: window.innerHeight,
				windowWidth: window.innerWidth
			});
		}

		function sendPageInfoToIframe(iframe, iframeId) {
			function debouncedTrigger() {
				trigger(
					'Send Page Info',
					`pageInfo:${getPageInfo()}`,
					iframe,
					iframeId
				);
			}
			debounceFrameEvents(debouncedTrigger, 32, iframeId);
		}

		function startPageInfoMonitor() {
			function setListener(type, func) {
				function sendPageInfo() {
					if (settings[id]) {
						sendPageInfoToIframe(settings[id].iframe, id);
					} else {
						stop();
					}
				}

				['scroll', 'resize'].forEach(evt => {
					log(id, `${type + evt} listener for sendPageInfo`);
					func(window, evt, sendPageInfo);
				});
			}

			function stop() {
				setListener('Remove ', removeEventListener);
			}

			function start() {
				setListener('Add ', addEventListener);
			}

			var id = iframeId; // Create locally scoped copy of iFrame ID

			start();

			if (settings[id]) {
				settings[id].stopPageInfo = stop;
			}
		}

		function stopPageInfoMonitor() {
			if (settings[iframeId] && settings[iframeId].stopPageInfo) {
				settings[iframeId].stopPageInfo();
				delete settings[iframeId].stopPageInfo;
			}
		}

		function checkIFrameExists() {
			let retBool = true;

			if (messageData.iframe === null) {
				warn(iframeId, `IFrame (${messageData.id}) not found`);
				retBool = false;
			}
			return retBool;
		}

		function getElementPosition(target) {
			const iFramePosition = target.getBoundingClientRect();

			getPagePosition(iframeId);

			return {
				x: Math.floor(Number(iFramePosition.left) + Number(pagePosition.x)),
				y: Math.floor(Number(iFramePosition.top) + Number(pagePosition.y))
			};
		}

		function scrollRequestFromChild(addOffset) {
			/* istanbul ignore next */ // Not testable in Karma
			function reposition() {
				pagePosition = newPosition;
				scrollTo();
				log(iframeId, '--');
			}

			function calcOffset() {
				return {
					x: Number(messageData.width) + offset.x,
					y: Number(messageData.height) + offset.y
				};
			}

			function scrollParent() {
				if (window.parentIFrame) {
					window.parentIFrame[`scrollTo${addOffset ? 'Offset' : ''}`](
						newPosition.x,
						newPosition.y
					);
				} else {
					warn(
						iframeId,
						'Unable to scroll to requested position, window.parentIFrame not found'
					);
				}
			}

			var offset = addOffset
				? getElementPosition(messageData.iframe)
				: { x: 0, y: 0 };
			var newPosition = calcOffset();

			log(
				iframeId,
				`Reposition requested from iFrame (offset x:${offset.x} y:${offset.y})`
			);

			if (window.top !== window.self) {
				scrollParent();
			} else {
				reposition();
			}
		}

		function scrollTo() {
			if (on('onScroll', pagePosition) !== false) {
				setPagePosition(iframeId);
			} else {
				unsetPagePosition();
			}
		}

		function findTarget(location) {
			function jumpToTarget() {
				const jumpPosition = getElementPosition(target);

				log(
					iframeId,
					`Moving to in page link (#${hash}) at x: ${jumpPosition.x} y: ${jumpPosition.y}`
				);
				pagePosition = {
					x: jumpPosition.x,
					y: jumpPosition.y
				};

				scrollTo();
				log(iframeId, '--');
			}

			function jumpToParent() {
				if (window.parentIFrame) {
					window.parentIFrame.moveToAnchor(hash);
				} else {
					log(
						iframeId,
						`In page link #${hash} not found and window.parentIFrame not found`
					);
				}
			}

			var hash = location.split('#')[1] || '';
			const hashData = decodeURIComponent(hash);
			var target =
				document.getElementById(hashData) ||
				document.getElementsByName(hashData)[0];

			if (target) {
				jumpToTarget();
			} else if (window.top !== window.self) {
				jumpToParent();
			} else {
				log(iframeId, `In page link #${hash} not found`);
			}
		}

		function on(funcName, val) {
			return chkEvent(iframeId, funcName, val);
		}

		function actionMsg() {
			if (settings[iframeId] && settings[iframeId].firstRun) firstRun();

			switch (messageData.type) {
				case 'close':
					closeIFrame(messageData.iframe);
					break;

				case 'message':
					forwardMsgFromIFrame(getMsgBody(6));
					break;

				case 'autoResize':
					settings[iframeId].autoResize = JSON.parse(getMsgBody(9));
					break;

				case 'scrollTo':
					scrollRequestFromChild(false);
					break;

				case 'scrollToOffset':
					scrollRequestFromChild(true);
					break;

				case 'pageInfo':
					sendPageInfoToIframe(
						settings[iframeId] && settings[iframeId].iframe,
						iframeId
					);
					startPageInfoMonitor();
					break;

				case 'pageInfoStop':
					stopPageInfoMonitor();
					break;

				case 'inPageLink':
					findTarget(getMsgBody(9));
					break;

				case 'reset':
					resetIFrame(messageData);
					break;

				case 'init':
					resizeIFrame();
					on('onInit', messageData.iframe);
					break;

				default:
					resizeIFrame();
			}
		}

		function hasSettings(iframeId) {
			let retBool = true;

			if (!settings[iframeId]) {
				retBool = false;
				warn(
					`${messageData.type} No settings for ${iframeId}. Message was: ${msg}`
				);
			}

			return retBool;
		}

		function iFrameReadyMsgReceived() {
			// eslint-disable-next-line no-restricted-syntax, guard-for-in
			for (const iframeId in settings) {
				trigger(
					'iFrame requested init',
					createOutgoingMsg(iframeId),
					settings[iframeId].iframe,
					iframeId
				);
			}
		}

		function firstRun() {
			if (settings[iframeId]) {
				settings[iframeId].firstRun = false;
			}
		}

		var msg = event.data;
		var messageData = {};
		var iframeId = null;

		if (msg === '[iFrameResizerChild]Ready') {
			iFrameReadyMsgReceived();
		} else if (isMessageForUs()) {
			messageData = processMsg();
			iframeId = messageData.id;
			if (settings[iframeId]) {
				settings[iframeId].loaded = true;
			}

			if (!isMessageFromMetaParent() && hasSettings(iframeId)) {
				log(iframeId, `Received: ${msg}`);

				if (checkIFrameExists() && isMessageFromIFrame()) {
					actionMsg();
				}
			}
		} else {
			info(iframeId, `Ignored: ${msg}`);
		}
	}

	function chkEvent(iframeId, funcName, val) {
		let func = null;
		let retVal = null;

		if (settings[iframeId]) {
			func = settings[iframeId][funcName];

			if (typeof func === 'function') {
				retVal = func(val);
			} else {
				throw new TypeError(
					`${funcName} on iFrame[${iframeId}] is not a function`
				);
			}
		}

		return retVal;
	}

	function removeIframeListeners(iframe) {
		const iframeId = iframe.id;
		delete settings[iframeId];
	}

	function closeIFrame(iframe) {
		const iframeId = iframe.id;
		if (chkEvent(iframeId, 'onClose', iframeId) === false) {
			log(iframeId, 'Close iframe cancelled by onClose event');
			return;
		}
		log(iframeId, `Removing iFrame: ${iframeId}`);

		try {
			// Catch race condition error with React
			if (iframe.parentNode) {
				iframe.parentNode.removeChild(iframe);
			}
		} catch (error) {
			warn(error);
		}

		chkEvent(iframeId, 'onClosed', iframeId);
		log(iframeId, '--');
		removeIframeListeners(iframe);
	}

	function getPagePosition(iframeId) {
		if (pagePosition === null) {
			pagePosition = {
				x:
					window.pageXOffset !== undefined
						? window.pageXOffset
						: document.documentElement.scrollLeft,
				y:
					window.pageYOffset !== undefined
						? window.pageYOffset
						: document.documentElement.scrollTop
			};
			log(iframeId, `Get page position: ${pagePosition.x},${pagePosition.y}`);
		}
	}

	function setPagePosition(iframeId) {
		if (pagePosition !== null) {
			window.scrollTo(pagePosition.x, pagePosition.y);
			log(iframeId, `Set page position: ${pagePosition.x},${pagePosition.y}`);
			unsetPagePosition();
		}
	}

	function unsetPagePosition() {
		pagePosition = null;
	}

	function resetIFrame(messageData) {
		function reset() {
			setSize(messageData);
			trigger('reset', 'reset', messageData.iframe, messageData.id);
		}

		log(
			messageData.id,
			`Size reset requested by ${
				messageData.type === 'init' ? 'host page' : 'iFrame'
			}`
		);
		getPagePosition(messageData.id);
		syncResize(reset, messageData, 'reset');
	}

	function setSize(messageData) {
		function setDimension(dimension) {
			if (!messageData.id) {
				log('undefined', 'messageData id not set');
				return;
			}
			messageData.iframe.style[dimension] = `${messageData[dimension]}px`;
			log(
				messageData.id,
				`IFrame (${iframeId}) ${dimension} set to ${messageData[dimension]}px`
			);
		}

		function chkZero(dimension) {
			// FireFox sets dimension of hidden iFrames to zero.
			// So if we detect that set up an event to check for
			// when iFrame becomes visible.

			/* istanbul ignore next */ // Not testable in PhantomJS
			if (!hiddenCheckEnabled && messageData[dimension] === '0') {
				hiddenCheckEnabled = true;
				log(iframeId, 'Hidden iFrame detected, creating visibility listener');
				fixHiddenIFrames();
			}
		}

		function processDimension(dimension) {
			setDimension(dimension);
			chkZero(dimension);
		}

		var iframeId = messageData.iframe.id;

		if (settings[iframeId]) {
			if (settings[iframeId].sizeHeight) {
				processDimension('height');
			}
			if (settings[iframeId].sizeWidth) {
				processDimension('width');
			}
		}
	}

	function syncResize(func, messageData, doNotSync) {
		/* istanbul ignore if */ // Not testable in PhantomJS
		if (
			doNotSync !== messageData.type &&
			requestAnimationFrame &&
			// including check for jasmine because had trouble getting spy to work in unit test using requestAnimationFrame
			!window.jasmine
		) {
			log(messageData.id, 'Requesting animation frame');
			requestAnimationFrame(func);
		} else {
			func();
		}
	}

	function trigger(calleeMsg, msg, iframe, id, noResponseWarning) {
		function postMessageToIFrame() {
			const target = settings[id] && settings[id].targetOrigin;
			log(
				id,
				`[${calleeMsg}] Sending msg to iframe[${id}] (${msg}) targetOrigin: ${target}`
			);
			iframe.contentWindow.postMessage(msgId + msg, target);
		}

		function iFrameNotFound() {
			warn(id, `[${calleeMsg}] IFrame(${id}) not found`);
		}

		function chkAndSend() {
			if (
				iframe &&
				'contentWindow' in iframe &&
				iframe.contentWindow !== null
			) {
				// Null test for PhantomJS
				postMessageToIFrame();
			} else {
				iFrameNotFound();
			}
		}

		function warnOnNoResponse() {
			function warning() {
				if (settings[id] && !settings[id].loaded && !errorShown) {
					errorShown = true;
					warn(
						id,
						`IFrame has not responded within ${settings[id].warningTimeout /
							1000} seconds. Check iFrameResizer.contentWindow.js has been loaded in iFrame. This message can be ignored if everything is working, or you can set the warningTimeout option to a higher value or zero to suppress this warning.`
					);
				}
			}

			if (
				!!noResponseWarning &&
				settings[id] &&
				!!settings[id].warningTimeout
			) {
				settings[id].msgTimeout = setTimeout(
					warning,
					settings[id].warningTimeout
				);
			}
		}

		var errorShown = false;

		id = id || iframe.id;

		if (settings[id]) {
			chkAndSend();
			warnOnNoResponse();
		}
	}

	function createOutgoingMsg(iframeId) {
		return `${iframeId}:${settings[iframeId].bodyMarginV1}:${settings[iframeId].sizeWidth}:${settings[iframeId].log}:${settings[iframeId].interval}:${settings[iframeId].enablePublicMethods}:${settings[iframeId].autoResize}:${settings[iframeId].bodyMargin}:${settings[iframeId].heightCalculationMethod}:${settings[iframeId].bodyBackground}:${settings[iframeId].bodyPadding}:${settings[iframeId].tolerance}:${settings[iframeId].inPageLinks}:${settings[iframeId].resizeFrom}:${settings[iframeId].widthCalculationMethod}`;
	}

	function setupIFrame(iframe, options) {
		function setLimits() {
			function addStyle(style) {
				if (
					Infinity !== settings[iframeId][style] &&
					settings[iframeId][style] !== 0
				) {
					iframe.style[style] = `${settings[iframeId][style]}px`;
					log(iframeId, `Set ${style} = ${settings[iframeId][style]}px`);
				}
			}

			function chkMinMax(dimension) {
				if (
					settings[iframeId][`min${dimension}`] >
					settings[iframeId][`max${dimension}`]
				) {
					throw new Error(
						`Value for min${dimension} can not be greater than max${dimension}`
					);
				}
			}

			chkMinMax('Height');
			chkMinMax('Width');

			addStyle('maxHeight');
			addStyle('minHeight');
			addStyle('maxWidth');
			addStyle('minWidth');
		}

		function newId() {
			let id = (options && options.id) || defaults.id + count++;
			if (document.getElementById(id) !== null) {
				id += count++;
			}
			return id;
		}

		function ensureHasId(iframeId) {
			if (iframeId === '') {
				// eslint-disable-next-line no-multi-assign
				iframe.id = iframeId = newId();
				logEnabled = (options || {}).log;
				log(iframeId, `Added missing iframe ID: ${iframeId} (${iframe.src})`);
			}

			return iframeId;
		}

		function setScrolling() {
			log(
				iframeId,
				`IFrame scrolling ${
					settings[iframeId] && settings[iframeId].scrolling
						? 'enabled'
						: 'disabled'
				} for ${iframeId}`
			);
			iframe.style.overflow =
				(settings[iframeId] && settings[iframeId].scrolling) === false
					? 'hidden'
					: 'auto';
			switch (settings[iframeId] && settings[iframeId].scrolling) {
				case 'omit':
					break;

				case true:
					iframe.scrolling = 'yes';
					break;

				case false:
					iframe.scrolling = 'no';
					break;

				default:
					iframe.scrolling = settings[iframeId]
						? settings[iframeId].scrolling
						: 'no';
			}
		}

		// The V1 iFrame script expects an int, where as in V2 expects a CSS
		// string value such as '1px 3em', so if we have an int for V2, set V1=V2
		// and then convert V2 to a string PX value.
		function setupBodyMarginValues() {
			if (
				typeof (settings[iframeId] && settings[iframeId].bodyMargin) ===
					'number' ||
				(settings[iframeId] && settings[iframeId].bodyMargin) === '0'
			) {
				settings[iframeId].bodyMarginV1 = settings[iframeId].bodyMargin;
				settings[iframeId].bodyMargin = `${settings[iframeId].bodyMargin}px`;
			}
		}

		function checkReset() {
			// Reduce scope of firstRun to function, because IE8's JS execution
			// context stack is borked and this value gets externally
			// changed midway through running this function!!!
			const firstRun = settings[iframeId] && settings[iframeId].firstRun;
			const resetRequertMethod =
				settings[iframeId] &&
				settings[iframeId].heightCalculationMethod in resetRequiredMethods;

			if (!firstRun && resetRequertMethod) {
				resetIFrame({ iframe, height: 0, width: 0, type: 'init' });
			}
		}

		function setupIFrameObject() {
			if (settings[iframeId]) {
				settings[iframeId].iframe.iFrameResizer = {
					close: closeIFrame.bind(null, settings[iframeId].iframe),

					removeListeners: removeIframeListeners.bind(
						null,
						settings[iframeId].iframe
					),

					resize: trigger.bind(
						null,
						'Window resize',
						'resize',
						settings[iframeId].iframe
					),

					moveToAnchor(anchor) {
						trigger(
							'Move to anchor',
							`moveToAnchor:${anchor}`,
							settings[iframeId].iframe,
							iframeId
						);
					},

					sendMessage(message) {
						message = JSON.stringify(message);
						trigger(
							'Send Message',
							`message:${message}`,
							settings[iframeId].iframe,
							iframeId
						);
					}
				};
			}
		}

		// We have to call trigger twice, as we can not be sure if all
		// iframes have completed loading when this code runs. The
		// event listener also catches the page changing in the iFrame.
		function init(msg) {
			function iFrameLoaded() {
				trigger('iFrame.onload', msg, iframe, undefined, true);
				checkReset();
			}

			function createDestroyObserver(MutationObserver) {
				if (!iframe.parentNode) {
					return;
				}

				const destroyObserver = new MutationObserver(mutations => {
					mutations.forEach(mutation => {
						const removedNodes = Array.prototype.slice.call(
							mutation.removedNodes
						); // Transform NodeList into an Array
						removedNodes.forEach(removedNode => {
							if (removedNode === iframe) {
								closeIFrame(iframe);
							}
						});
					});
				});
				destroyObserver.observe(iframe.parentNode, {
					childList: true
				});
			}

			const MutationObserver = getMutationObserver();
			if (MutationObserver) {
				createDestroyObserver(MutationObserver);
			}

			addEventListener(iframe, 'load', iFrameLoaded);
			trigger('init', msg, iframe, undefined, true);
		}

		function checkOptions(options) {
			if (typeof options !== 'object') {
				throw new TypeError('Options is not an object');
			}
		}

		function copyOptions(options) {
			// eslint-disable-next-line no-restricted-syntax
			for (const option in defaults) {
				if (Object.prototype.hasOwnProperty.call(defaults, option)) {
					settings[iframeId][option] = Object.prototype.hasOwnProperty.call(
						options,
						option
					)
						? options[option]
						: defaults[option];
				}
			}
		}

		function getTargetOrigin(remoteHost) {
			return remoteHost === '' ||
				remoteHost.match(/^(about:blank|javascript:|file:\/\/)/) !== null
				? '*'
				: remoteHost;
		}

		function depricate(key) {
			const splitName = key.split('Callback');

			if (splitName.length === 2) {
				const name = `on${splitName[0]
					.charAt(0)
					.toUpperCase()}${splitName[0].slice(1)}`;
				this[name] = this[key];
				delete this[key];
				warn(
					iframeId,
					`Deprecated: '${key}' has been renamed '${name}'. The old method will be removed in the next major version.`
				);
			}
		}

		function processOptions(options) {
			options = options || {};
			settings[iframeId] = {
				firstRun: true,
				iframe,
				remoteHost:
					iframe.src &&
					iframe.src
						.split('/')
						.slice(0, 3)
						.join('/')
			};

			checkOptions(options);
			Object.keys(options).forEach(depricate, options);
			copyOptions(options);

			if (settings[iframeId]) {
				settings[iframeId].targetOrigin =
					settings[iframeId].checkOrigin === true
						? getTargetOrigin(settings[iframeId].remoteHost)
						: '*';
			}
		}

		function beenHere() {
			return iframeId in settings && 'iFrameResizer' in iframe;
		}

		var iframeId = ensureHasId(iframe.id);

		if (!beenHere()) {
			processOptions(options);
			setScrolling();
			setLimits();
			setupBodyMarginValues();
			init(createOutgoingMsg(iframeId));
			setupIFrameObject();
		} else {
			warn(iframeId, 'Ignored iFrame, already setup.');
		}
	}

	function debouce(fn, time) {
		if (timer === null) {
			timer = setTimeout(() => {
				timer = null;
				fn();
			}, time);
		}
	}

	const frameTimer = {};
	function debounceFrameEvents(fn, time, frameId) {
		if (!frameTimer[frameId]) {
			frameTimer[frameId] = setTimeout(() => {
				frameTimer[frameId] = null;
				fn();
			}, time);
		}
	}

	// Not testable in PhantomJS
	/* istanbul ignore next */

	function fixHiddenIFrames() {
		function checkIFrames() {
			function checkIFrame(settingId) {
				function chkDimension(dimension) {
					return (
						(settings[settingId] &&
							settings[settingId].iframe.style[dimension]) === '0px'
					);
				}

				function isVisible(el) {
					return el.offsetParent !== null;
				}

				if (
					settings[settingId] &&
					isVisible(settings[settingId].iframe) &&
					(chkDimension('height') || chkDimension('width'))
				) {
					trigger(
						'Visibility change',
						'resize',
						settings[settingId].iframe,
						settingId
					);
				}
			}

			Object.keys(settings).forEach(key => {
				checkIFrame(key);
			});
		}

		function mutationObserved(mutations) {
			log(
				'window',
				`Mutation observed: ${mutations[0].target} ${mutations[0].type}`
			);
			debouce(checkIFrames, 16);
		}

		function createMutationObserver() {
			const target = document.querySelector('body');
			const config = {
				attributes: true,
				attributeOldValue: false,
				characterData: true,
				characterDataOldValue: false,
				childList: true,
				subtree: true
			};
			const observer = new MutationObserver(mutationObserved);

			observer.observe(target, config);
		}

		var MutationObserver = getMutationObserver();
		if (MutationObserver) {
			createMutationObserver();
		}
	}

	function resizeIFrames(event) {
		function resize() {
			sendTriggerMsg(`Window ${event}`, 'resize');
		}

		log('window', `Trigger event: ${event}`);
		debouce(resize, 16);
	}

	// Not testable in PhantomJS
	/* istanbul ignore next */
	function tabVisible() {
		function resize() {
			sendTriggerMsg('Tab Visable', 'resize');
		}

		if (document.visibilityState !== 'hidden') {
			log('document', 'Trigger event: Visiblity change');
			debouce(resize, 16);
		}
	}

	function sendTriggerMsg(eventName, event) {
		function isIFrameResizeEnabled(iframeId) {
			return (
				settings[iframeId] &&
				settings[iframeId].resizeFrom === 'parent' &&
				settings[iframeId].autoResize &&
				!settings[iframeId].firstRun
			);
		}

		Object.keys(settings).forEach(iframeId => {
			if (isIFrameResizeEnabled(iframeId)) {
				trigger(eventName, event, settings[iframeId].iframe, iframeId);
			}
		});
	}

	function setupEventListeners() {
		addEventListener(window, 'message', iFrameListener);

		addEventListener(window, 'resize', () => {
			resizeIFrames('resize');
		});

		addEventListener(document, 'visibilitychange', tabVisible);

		addEventListener(document, '-webkit-visibilitychange', tabVisible);
	}

	function factory() {
		function init(options, element) {
			function chkType() {
				if (!element.tagName) {
					throw new TypeError('Object is not a valid DOM element');
				} else if (element.tagName.toUpperCase() !== 'IFRAME') {
					throw new TypeError(
						`Expected <IFRAME> tag, found <${element.tagName}>`
					);
				}
			}

			if (element) {
				chkType();
				setupIFrame(element, options);
				iFrames.push(element);
			}
		}

		function warnDeprecatedOptions(options) {
			if (options && options.enablePublicMethods) {
				warn(
					'enablePublicMethods option has been removed, public methods are now always available in the iFrame'
				);
			}
		}

		let iFrames;

		setupRequestAnimationFrame();
		setupEventListeners();

		return function iFrameResizeF(options, target) {
			iFrames = []; // Only return iFrames past in on this call

			warnDeprecatedOptions(options);

			switch (typeof target) {
				case 'undefined':
				case 'string':
					Array.prototype.forEach.call(
						document.querySelectorAll(target || 'iframe'),
						init.bind(undefined, options)
					);
					break;

				case 'object':
					init(options, target);
					break;

				default:
					throw new TypeError(`Unexpected data type (${typeof target})`);
			}

			return iFrames;
		};
	}

	function createJQueryPublicMethod($) {
		if (!$.fn) {
			info('', 'Unable to bind to jQuery, it is not fully loaded.');
		} else if (!$.fn.iFrameResize) {
			$.fn.iFrameResize = function $iFrameResizeF(options) {
				function init(index, element) {
					setupIFrame(element, options);
				}

				return this.filter('iframe')
					.each(init)
					.end();
			};
		}
	}

	if (window.jQuery) {
		createJQueryPublicMethod(window.jQuery);
	}

	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof module === 'object' && typeof module.exports === 'object') {
		// Node for browserfy
		module.exports = factory();
	}
	window.iFrameResize = window.iFrameResize || factory();

	function attachResizeDynamically() {
		const scripts = document.getElementsByTagName('script');
		Array.prototype.forEach.call(scripts, function(script) {
			const id = script.getAttribute('data-iframe-id');

			if (id) {
				(function initiateFrameResize() {
					var REFRESH_TIME_MS = 1000;
					var MAX_INTERVAL_COUNT = 40;

					var intervalCount = 0;
					var interval = setInterval(function() {
						var frameElem = document.getElementById(id);
						if (frameElem) {
							iFrameResize({ log: false }, '#' + id);
							clearInterval(interval);
						}
						intervalCount++;

						if (intervalCount >= MAX_INTERVAL_COUNT) {
							clearInterval(interval);
						}
					}, REFRESH_TIME_MS);
				})();
			}
		});
	}
	attachResizeDynamically();
})();
