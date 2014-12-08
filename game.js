'use strict';

function StateMachine() {
	var stateRegistry = {}, flags = {}, universalTransitions = {}, currentState;

	/**
	 * Adds a new state and sets it to the current state. Only works once.
	 */
	this.addInitialState = function(initialStateName) {
		if (typeof currentState !== 'undefined') {
			return;
		}
		currentState = new State(initialStateName);
		stateRegistry[initialStateName] = currentState;
		return currentState;
	}

	/**
	 * @param	string	state to add to the state machine
	 * @return	state
	 */
	this.addState = function(stateName) {
		// add state to the registry
		stateRegistry[stateName] = new State(stateName);
		return stateRegistry[stateName];
	};

	/**
	 * Adds a transition that can be taken from any state.
	 * If the current state may override this with its own
	 * transition for the given action.
	 */
	this.addUniversalTransition = function(acts, func) {
		if (acts.constructor != Array) {
			acts = [acts];
		}
		acts.forEach(function(action) {
			universalTransitions[action] = func;
		}, this);
		return this;
	};

	/**
	 * Returns a reference to the transition callback function
	 */
	this.getTransitionFromState = function(stateName, actionName) {
		return stateRegistry[stateName].getTransition(actionName);
	};

	/**
	 * @return	bool
	 */
	this.canTakeAction = function(action) {
		return currentState.canTransition(action) || universalTransitions.hasOwnProperty(action);
	};

	/**
	 * @param	action	name of an action to use to transition
	 * @return	bool	true if action was valid and transition occurred
	 */
	this.takeAction = function(action) {
		var transitionResult;
		if (currentState.canTransition(action)) {
			transitionResult = currentState.runTransition(action);
		} else if (universalTransitions.hasOwnProperty(action)) {
			transitionResult = universalTransitions[action](action);
		}

		if (transitionResult && transitionResult.constructor == String && stateRegistry.hasOwnProperty(transitionResult)) {
			currentState = stateRegistry[transitionResult];
			return true;
		} else {
			return false;
		}
	}
}

function State(name) {
	this.name = name;
	// string actions mapped to transition functions
	this.transitions = {};

	/**
	 * registers a callback for when this state is first reached
	 */
	this.onFirstArrival = function(cb) {
		// TODO
	}

	/**
	 * registers a callback for this state is reached after the first time
	 */
	this.onLaterArrivals = function(cb) {
		// TODO
	}

	/**
	 * @param	acts	array or string, actions that can trigger this transition
	 * @param	func	function, transition action that must return the string destination state name
	 *            function params is the name of the current state
	 */
	this.addTransition = function(acts, func) {
		if (acts.constructor != Array) {
			acts = [acts];
		}
		acts.forEach(function(action) {
			this.transitions[action] = func;
		}, this);
		return this;
	};

	/**
	 * returns true if action can trigger a transition from this state
	 */
	this.canTransition = function(action) {
		return this.transitions.hasOwnProperty(action);
	}

	/**
	 * Returns a reference to the transition function
	 */
	this.getTransition = function(action) {
		return this.transitions[action];
	}

	/**
	 * returns the state arrived at by activating a transition
	 * returns false if the transaction was invalid
	 */
	this.runTransition = function(action) {
		if (!this.transitions.hasOwnProperty(action)) {
			return false;
		}
		return this.transitions[action](this.name);
	}
}

function Display(textSelector, commandsSelector, fontSize) {
	var self = this,
		$text = $(textSelector),
		$commands = $(commandsSelector),
		$remainingSpace = $('#remainingspace'),
		$emptyPrompt,
		fadeSpacing = 1000,
		fontSizeStep = 4;

	$('#screen').css('font-size', fontSize+'pt');
	this.shrinkFont = function() {
		if (fontSize > 4) fontSize = fontSize - fontSizeStep;
		$('#screen').animate({"font-size": fontSize+'pt'});
	}

	/**
	 * Gradually transition the background and text colors
	 */
	this.setColorScheme = function(bg, fg) {
		// TODO
	};

	/**
	 * Calculate how much screen space is remaining
	 */
	this.getRemainingSpace = function() {
		return 600 - $text.first()[0].clientHeight - $commands.first()[0].clientHeight;
	};

	this.updateRemainingSpace = function() {
		var space = Math.max(0, self.getRemainingSpace());
		$remainingSpace.animateNumber({number: space});
		if (space <= 0 && !Command.registry['restart']) {
			this.addCommands(['restart'], 5);
		}
	};

	/**
	 * @param	lines	array of strings
	 */
	this.addLines = function(lines, internal) {
		lines.forEach(function(line, index) {
			$('<p></p>')
				.text(line)
				.css('opacity', 0)
				.appendTo($text)
				.delay( internal ? 0 : fadeSpacing*(index+1) )
				.animate({opacity: 1});
		}, this);

		if (!internal) {
			$emptyPrompt = $('<p></p>')
				.text('>')
				.css('opacity', 0)
				.appendTo($text)
				.delay(fadeSpacing*(lines.length+1))
				.animate({opacity: 1});
		}

		// this.updateRemainingSpace();
		return lines.length + 2;
	};

	this.addLinesWithCommands = function(lines, commands) {
		this.addCommands(commands, this.addLines(lines));
	};

	this.clearText = function() {
		$text.empty();
	};

	this.echoCommand = function(action) {
		$emptyPrompt.text('> ' + action);
	};

	this.nothingHappens = function() {
		this.addLines([
			'That action doesnt apply at the moment.'
		]);
	};

	/**
	 * @param	commands	array of string names of commands
	 * @param	delay		how many lines we need to wait on
	 */
	this.addCommands = function(commands, delay) {
		if (!delay) {
			delay = 0;
		}

		commands.forEach(function(cmdName, index) {
			var cmd = Command.registry[cmdName];

			// create new command, if necessary
			if (typeof cmd === 'undefined') {
				cmd = new Command(cmdName);
			}

			if (cmd.added) {
				return; // avoid adding duplicate commands
			}

			$('<span></span>')
				.text(cmd.text)
				.addClass('cmd')
				.css('opacity', 0)
				.appendTo($commands)
				.delay(fadeSpacing*(index+delay))
				.animate({opacity: 1});
			cmd.added = true;
		}, this);

		this.updateRemainingSpace();
	};

	// take an action when a command is clicked
	$commands.on('click', 'span', function() {
		if (self.getRemainingSpace() < 1 && this.textContent !== 'restart') return;
		self.echoCommand(this.textContent);
		if (!game.takeAction(this.textContent)) {
			self.nothingHappens();
		}
	});
}

function Command(text) {
	this.text = text;
	this.added = false;

	// register this in the catalog of all commands
	Command.registry[text] = this;
}
Command.registry = {};

// Define game constants
var display,
	game = new StateMachine();

// define game content
game.addUniversalTransition('restart', function() {
	display.clearText();
	display.shrinkFont();
	return game.getTransitionFromState('initial', 'begin')();
});

game.addInitialState('initial').addTransition('begin', function() {
	display.addLinesWithCommands(
		['You are asleep.'],
		['open eyes']
	);
	return 'first asleep';
});

game.addState('first asleep').addTransition('open eyes', function() {
	display.addLinesWithCommands([
		'Ugh. You had been having such a plesant nap, but the thought of the upcoming deadline coaxes you awake, slightly groggy.',
		'You are sitting in a comfortable chair in a dark room. You can feel the gentle contours of a computer mouse under your right hand.'
	], ['move hand']);
	return 'waking up';
}).addTransition('move hand', function() {
	display.addLinesWithCommands([
		'Almost immediately you are blinded by a large computer screen less than a meter from your face.',
		'It eagerly burns your retinas with the image of your half completed game.',
	], [
		'look at game',
		'look at clock',
	]);
	return 'computer awake';
});

game.addState('waking up').addTransition('move hand', game.getTransitionFromState('first asleep', 'move hand'));

game.addState('computer awake').addTransition('look at game', function(state) {
	display.addLinesWithCommands([
		'Truth be told, it\'s nowhere close to halfway complete. Just a couple of abstract sprites that will hopefully replace the red and green rectangles currently sliding back and forth across a dark grey background.'
	], ['get back to work']);
	if (state.name === 'aware of time') {
		return 'aware of both';
	} else {
		return 'aware of game';
	}
}).addTransition('look at clock', function(state) {
	display.addLinesWithCommands([
		'You glance towards the corner of the screen. Again.',
		'3:47',
		'Almost ten hours since the theme was announced. Ugh again.',
		'It will be getting light outside soon. You need rest.'
	], ['go to bed']);
	if (state === 'aware of game') {
		return 'aware of both';
	} else {
		return 'aware of time';
	}
});

game.addState('aware of time')
.addTransition('look at game', game.getTransitionFromState('computer awake', 'look at game'))
.addTransition('look at clock', function(state) {
	display.addLines([
		'You glance towards the corner of the screen yet again.',
		'Unfortunately, time has continued to move forward. Another minute gone.'
	]);
	return state;
})
.addTransition('go to bed', function() {
	display.addLinesWithCommands([
		'No need to feel defeated. It\'s not like you could complete the entire game without any sleep at all.',
		'You shuffle past your trusty alarm clock (better known as a cell phone) as it charges from your computer and walk into your room. In a practiced motion you strip off the day\'s clothes and fling them across the room to rest on top of the hamper, all while climbing into bed.'
	], [
		'brainstorm',
		'close eyes'
	]);
	return 'in bed';
});

game.addState('aware of game')
.addTransition('get back to work', function() {
	display.addLines([
		'You try to focus on the task at hand. Just need to get this sprite looking decent and then you can import it into the engine...'
	]);
})
.addTransition('look at clock', game.getTransitionFromState('computer awake', 'look at clock'))
.addTransition('look at game', function(state) {
	display.addLines([
		'The red and green rectangles slide endlessly back and forth.'
	]);
	return state;
});

game.addState('aware of both')
.addTransition('get back to work', game.getTransitionFromState('aware of game', 'get back to work'))
.addTransition('look at clock', game.getTransitionFromState('aware of time', 'look at clock'))
.addTransition('look at game', game.getTransitionFromState('aware of game', 'look at game'))
.addTransition('go to bed', game.getTransitionFromState('aware of time', 'go to bed'));

game.addState('in bed');

// begin game
jQuery(function() {
	display = new Display('#text', '#commands', 24);
	game.takeAction('begin');
})
