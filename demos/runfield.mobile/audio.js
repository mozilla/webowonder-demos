      createAudio = function(e) {
        var audio = document.createElement('audio');
        var source = document.createElement('source');
        source.src = e+'.ogg';
        source.type = 'audio/ogg; codecs="vorbis"';
        audio.appendChild(source);
        var source = document.createElement('source');
        source.src = e+'.ogg.mp3';
        source.type = 'audio/mpeg; codecs="mp3"';
        audio.appendChild(source);
        return audio;
      }
