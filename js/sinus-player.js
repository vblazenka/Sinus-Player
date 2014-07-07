'use strict';

/************************
* Name: SinusPlayer
* Author: Vedran Blazenka
* ***********************/

function SinusPlayer() {
    // check if the default naming is enabled, if not use the chrome one.
    if (! window.AudioContext) {
        if (! window.webkitAudioContext) {
            alert('no audiocontext found');
        }
        window.AudioContext = window.webkitAudioContext;
    }


    // check if the default naming is enabled, if not use the chrome one.
    if (! window.AudioContext) {
        if (! window.webkitAudioContext) {
            alert('no audiocontext found');
        }
        window.AudioContext = window.webkitAudioContext;
    }


    /*
     An audio context controls the creation of the nodes it contains
     and the execution of the audio processing, or decoding.
     */
    this.context = new AudioContext();

    /*
     Declared var for the createBuffer() method of the AudioContext.
     Which can then be populated by data, and played via an AudioBufferSourceNode.
     @Returns: empty AudioBuffer object
     */
    this.audioBuffer;
    this.sourceNode;

    this.loaded = false;
    this.run = false;

    //Set up our canvas
    this.canvas = document.getElementById("canvas");
    this.width = canvas.width;
    this.height = canvas.height;
    this.canvas.style.width = (this.width)+'px';
    this.canvas.style.height = (this.height)+'px';
    this.ctx = this.canvas.getContext("2d");

    this.javascriptNode;
    this.analyser;
    this.array;
    this.average;

}


SinusPlayer.prototype = {
    setupAudioNodes: function () {
        /*
         @Summary:
            Creates a ScriptProcessorNode, which can be used for direct audio processing
            With the ScriptProcessorNode we can process the raw audio data
            directly from javascript. We can use this to write our own
            analyzers or complex components. When creating the javascript node, you can specify
            the interval at which it is called.
         @Returns: ScriptProcessorNode
         */
        this.javascriptNode = this.context.createScriptProcessor(2048, 1, 1);

        // connect to destination, else it isn't called.
        this.javascriptNode.connect(this.context.destination);

        /*
         @Summary:
            With the analyser node we can perform real-time frequency and time domain analysis.
         */
        this.analyser = this.context.createAnalyser();

        //Is a double value representing the averaging constant with the last analysis frame. Values: [0..1]
        this.analyser.smoothingTimeConstant = 0.3;
        /*
         Is an unsigned long value representing the size of the Fast Fourier Transform to be
         used to determine the frequency domain.
         */
        this.analyser.fftSize = 1024;

        // create a buffer source node
        this.sourceNode = this.context.createBufferSource();

        // connect the source to the analyser
        this.sourceNode.connect(this.analyser);

        // we use the javascript node to draw at a specific interval.
        this.analyser.connect(this.javascriptNode);

        // and connect to destination, if you want audio
        this.sourceNode.connect(this.context.destination);
        console.log("setupAudioNodes");

    },

    loadSound: function (url) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';

        var that = this;

        // When loaded decode the data
        request.onload = function() {
            // decode the data
            //used to asynchronously decode audio file data contained in an ArrayBuffer
            //@Returns: AudioBuffer representing the decoded PCM audio data
            that.context.decodeAudioData(request.response, function(buffer) {
                // when the audio is decoded play the sound
                that.sourceNode.buffer = buffer;
                that.playSound(buffer);
                that.onAudioProcess(that.average);

            }, function () {
                console.log("Error loading sound");
            });
        };
        request.send();
        console.log("loadSound");
    },

    drawGraph: function (average) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        var data = this.sourceNode.buffer.getChannelData(0);
       // console.log(data);
        var step = Math.ceil(data.length / this.width);
       // console.log(step);
        var amp = this.height / 2;

        for(var i=0; i < this.width; i++){
            var min = 1.0;
            var max = -1.0;
            for (var j=0; j<step; j++) {
                var d = data[(i*step)+j];
                if (d < min)
                    min = d;
                if (d > max)
                    max = d;
            }
            this.ctx.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
        }
    },

    onAudioProcess: function (average, bufferSrc) {
        var that = this;
        that.javascriptNode.onaudioprocess = function() {

        // get the average, bincount is fftsize / 2
        that.array = new Uint8Array(that.analyser.frequencyBinCount);
        that.analyser.getByteFrequencyData(that.array);
        that.average = that.getAverageVolume(that.array);

        // clear the current state
        that.ctx.fillRect(0, 0, this.width, this.height);
        that.drawGraph(that.average);


        console.log("onAudioProcess");
    };

    },

    getAverageVolume: function () {
        var values = 0;
        var average;

        var length = this.array.length;

        // get all the frequency amplitudes
        for (var i = 0; i < length; i++) {
            values += this.array[i];
        }

        average = values / length;
        return average;

    },


    init: function () {
        this.setupAudioNodes();
        this.loadSound("audio/AnaDopplerMp3.wav");
        console.log("init");
    },

    playSound: function (buffer) {
        this.sourceNode.buffer = buffer;
        this.sourceNode.start(0);
        console.log("playSound");
    },

    start: function () {
        this.init();
        this.playSound();
        console.log("start");
   },


    clear: function () {
      this.ctx.fillRect(0, 0, this.width, this.height);
    },

   draw: function () {
       //if (!this.run) return;
        this.onAudioProcess();
       //this.clear();
   }

};

