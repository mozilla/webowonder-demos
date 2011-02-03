(function( global, doc ){

  var timeline = {
    subway:{
      start:118,
      end:158,
      speed:1,
      looping:false,
      
      objects:{
        thug1SubwayScale: {
          objRef: 'thug1SubwayScale',
          tracks:{
            scale:[
              [0,[3,3,3]]
            ]              
          }
        },
        thug1SubwayAction:{objRef     : 'thug1SubwayAction',tracks:{action:[
          [  0.00, 'walk-front']
        ]}},
        thug1SubwayPosition:{objRef     : 'thug1SubwayPosition',tracks:{position:[
          [  0.00, [0,0,0]]
        ]}},
        thug1SubwayRotation:{objRef     : 'thug1SubwayRotation',tracks:{rotation:[
          [  0.00, [0,90,0]]
        ]}},
        
        thug2SubwayScale: {
          objRef: 'thug2SubwayScale',
          tracks:{
            scale:[
              [0,[3,3,3]]
            ]              
          }
        },
        thug2SubwayAction:{objRef     : 'thug2SubwayAction',tracks:{action:[
          [  0.00, 'walk-front']
        ]}},
        thug2SubwayPosition:{objRef     : 'thug2SubwayPosition',tracks:{position:[
          [  0.00, [0,0,0]]
        ]}},
        thug2SubwayRotation:{objRef     : 'thug2SubwayRotation',tracks:{rotation:[
          [  0.00, [0,90,0]]
        ]}},
        

        smallrat1SubwayAction:{objRef     : 'smallrat1SubwayAction',tracks:{action:[
          [  0.00, 'walk']
        ]}},
        smallrat1SubwayPosition:{objRef     : 'smallrat1SubwayPosition',tracks:{position:[
          [  0.00, [0,1.7,0]]
        ]}},
        smallrat1SubwayRotation:{objRef     : 'smallrat1SubwayRotation',tracks:{rotation:[
          [  0.00, [0,90,0]]
        ]}},
        smallrat1SubwayScale:{objRef     : 'smallrat1SubwayScale',tracks:{scale:[
          [  0.00, [6,6,6]]
        ]}},

        smallrat2SubwayAction:{objRef     : 'smallrat2SubwayAction',tracks:{action:[
          [  0.00, 'walk']
        ]}},
        smallrat2SubwayPosition:{objRef     : 'smallrat2SubwayPosition',tracks:{position:[
          [  0.00, [0,1.7,0]]
        ]}},
        smallrat2SubwayRotation:{objRef     : 'smallrat2SubwayRotation',tracks:{rotation:[
          [  0.00, [0,90,0]]
        ]}},
        smallrat2SubwayScale:{objRef     : 'smallrat2SubwayScale',tracks:{scale:[
          [  0.00, [6,6,6]]
        ]}},
      }

    },

    dungeon:{
      start:238,
      end:297,
      speed:1,
      looping:false,
      
      objects:{

        kraddyDungeonScale: {
          objRef: 'kraddyDungeonScale',
          tracks:{
            scale:[
              [0,[4,4,4]]
            ]              
          }
        },
        kraddyDungeonAction:{objRef     : 'kraddyDungeonAction',tracks:{action:[
          [  0.00, 'hang'],
          [  244.08, 'fall'],
          [  245, 'jump'],
          [  246, 'walk'],
          [  246.1, 'walk']
          
        ]}},
        kraddyDungeonPosition:{objRef     : 'kraddyDungeonPosition',tracks:{position:[
          [  0.00, [0,1.1,0]],
          [  244.08, [0,0.1,1]],
          [  244.8, [0,1.1,0]]
        ]}},
        kraddyDungeonRotation:{objRef     : 'kraddyDungeonRotation',tracks:{rotation:[
          [  0.00, [0,-180,-35]],
          [  244.08, [0,-180,-55]],
          [  244.8, [0,-90,0]],
        ]}},

        thug1DungeonScale: {
          objRef: 'thug1DungeonScale',
          tracks:{
            scale:[
              [0,[6,6,6]]
            ]              
          }
        },
        thug1DungeonAction:{objRef     : 'thug1DungeonAction',tracks:{action:[
          [  0.00, 'walk']
        ]}},
        thug1DungeonPosition:{objRef     : 'thug1DungeonPosition',tracks:{position:[
          [  0.00, [0,0,0]]
        ]}},
        thug1DungeonRotation:{objRef     : 'thug1DungeonRotation',tracks:{rotation:[
          [  0.00, [0,180,0]]
        ]}},
        
        thug2DungeonScale: {
          objRef: 'thug2DungeonScale',
          tracks:{
            scale:[
              [0,[6,6,6]]
            ]              
          }
        },
        thug2DungeonAction:{objRef     : 'thug2DungeonAction',tracks:{action:[
          [  0.00, 'walk']
        ]}},
        thug2DungeonPosition:{objRef     : 'thug2DungeonPosition',tracks:{position:[
          [  0.00, [0,0,0]]
        ]}},
        thug2DungeonRotation:{objRef     : 'thug2DungeonRotation',tracks:{rotation:[
          [  0.00, [0,180,0]]
        ]}}
        

      }

    },

    city :{
      start: 0, 
      end: 148,
      speed: 1,
      looping: false,
      
      objects:{
              
        kraddyScale: {
          objRef: 'kraddyScale',
          tracks:{
            scale:[
              [   0.0, [3,3,3]],

              [  54.4, [3,3,3]],
              [  54.6, [3,3,100]],
              [  55.0, [3,3,3]],

              [  66.5, [3,3,3]],
              [  67.0, [3,3,100]],
              [  67.5, [3,3,3]],

              [ 150.0, [3,3,3]],
            ]
          }
        },
      
        kraddyRotation: {
          objRef: 'kraddyRotation',
          tracks:{
            rotation:[
              [0,[0,180,0]],
              [    0.0, [ 0, 180, 0 ] ],
              [   44.0, [ 0, 180, 0 ]],
              [   45.0, [ 0, 220, 0 ]],
              [   46.0, [ 0, 220, 0 ]],
              [  46.71, [ 0, 180, 0 ]],
              [  47.62, [ 0, 90, 0 ]],
              [  48.0, [ 0, 90, 0 ]],
              [  52.7, [ 0, 90, 0 ]],
              [  53.1, [ 0, 180, 0 ]],
              [  57.1, [0,180,0]],
              [  57.12, [0,180,-90]],
              [  57.79, [0,180,-90]],
              [  57.8, [0,180,0]],
              [  59.0, [0,180,0]],
              [  59.8, [0,90,0]],

              [  64.8, [0,90,0]],
              [  65.0, [0,90,0]],
              [  66.9, [0,90,0]],

              [  67.0, [0,90,0]],
              [  67.2, [0,0,0]],
              [  67.4, [0,90,0]],
              
              [  67.5, [0,90,0]],
              [  67.6, [0,180,0]],
              [  68.0, [0,150,0]],

              [  76.0, [0,210,0]],
              [  76.1, [0,210,0]],
              [  77.8, [0,150,0]],



              
              [  138.0, [0,150,0]]
            ]
          }
        },
        
        kraddyAction: {
          objRef: 'kraddyAction',
          tracks: {
            action:[
              [  0.0, 'walk'],
              [ 26.0, 'jump'],
              [ 27.0, 'walk'],
              [ 27.5, 'kick'],
              [ 28.0, 'walk'],
              [ 30.7, 'punch'],
              [ 31.2, 'walk'],
              [ 33.1, 'twirl-kick'],
              [ 34.2, 'walk'],
              [ 38.4, "walk-front"],
              [ 45.7, "walk-front"],
              [ 46.3, 'walk'],

              [ 46.6, 'jump'],
              [ 46.8, 'walk'],
              [ 47.4, 'jump'],
              [ 47.6, 'walk-back'],
              [ 52.8, 'walk'],

              [ 53.2, 'jump'],
              [ 53.4, 'kick'],
              [ 53.8, 'twirl-kick'],
              [ 54.0, 'jump'],
              [ 54.2, 'jump'],
              [ 54.1, 'walk'],
              [ 54.6, 'punch'],
              [ 54.9, 'walk'],


              [  56.0, 'twirl-kick'],
              [  56.5, 'jump'],
              [  57.0, 'punch'],
              [  57.2, 'jump'],
              [  57.4, 'twirl-kick'],
              [  57.8, 'punch'],


              [  60.4, 'twirl-kick'],
              [  62.0, 'walk'],
              [  63.8, 'walk-back'],
              [  67.0, 'kick' ],
              [  67.2, 'walk' ],
              [  67.3, 'walk' ],

              [  69.8, 'kick' ],
              [  70.2, 'walk' ],
              [  76.1, 'walk-back'],
              [  77.8, 'twirl-kick'],
              [  79.3, 'punch'],
              [  79.5, 'kick'],
              [  80.0, 'walk'],


  
/*
              [ 55.8, 'twirl-kick'],
              [ 59.6, 'jump-kick'],
*/              
              [150.6, 'walk-back'],
            ]
          }
        },

        kraddyPosition: {
          objRef: 'kraddyPosition',
          tracks:{
            position:[
              [  0.0, [ 0,  20, 0 ] ],
              [ 20.0, [ 0,  20, 0 ] ],
              [ 26.0, [ 0,  15, 0 ] ],
              [ 26.6, [ 0, 0.5, 0 ] ],
              [ 33.0, [ 0, 0.5, 0 ] ],
              [ 33.5, [ 0, 2.5, 0 ] ],
              [ 34.0, [ 0, 0.5, 0 ] ],
              [ 53.2, [ 0, 0.5, 0 ] ],
              [ 53.4, [ 1, 3.5, 0 ] ],
              [ 53.8, [ 1, 2.5, 0 ] ],
              [ 54.0, [ -2, 3.5, 0 ]],
              [ 54.2, [ 1, 0.5, 0 ] ],
              [ 54.4, [ 2, 0.5, 0 ] ],
              [ 54.6, [ -.5, 0.5, 0 ] ],
              [ 56.6, [ -.25, 0.5, 0 ] ],
              [ 57.2, [ 0, 0.5, 0 ],'outBounce' ],
              [ 57.4, [ 0, -1, 0 ] ],
              [ 57.6, [ 0, 1, 0 ] ],
              [ 57.8, [ 0, 0.5, 0 ] ],

              [ 61.2, [ 0, 0.5, 0 ] ],
              [ 61.5, [ 0, 2.0, 0 ] ],
              [ 62.0, [ 0, 0.5, 0 ] ],

              [150.0, [ 0, 0.5, 0 ] ],              
            ]
          }
        },


        thug1Position:{objRef   : 'thug1Position',tracks:{position:[
          [   0.0,[0,0.5,0],'step'],
        ]}},
        thug1Scale:{objRef      : 'thug1Scale',tracks:{scale:[
          [0,[3.8,3,3]]
        ]}},
        thug1Rotation:{objRef   : 'thug1Rotation',tracks:{rotation:[
          [   0.0, [0, 90,0]],
          [  39.0, [0, 90,0]],
          [  40.0, [0,140,0]],
          [  52.3, [0,90,0]],
          [  53.3, [0,180,0]],
          [  59.6, [0,180,0]],
          [  59.6, [0,130,0]],
          [  60.0, [0,100,0]],
          [  70.0, [0,100,0]],
          
          [ 150.0, [0,90,0]],
        ]}},
        thug1Action:{objRef     : 'thug1Action',tracks:{action:[
          [   0.0, 'walk-front'],
          [  42.8, 'jump-knock'],
          [  43.2, 'walk-front'],
          [  54.6, 'knock-down'],

          [  55.0, 'walk'],
          [  56.3, 'knock-down'],
          [  56.7, 'walk'],
          [  57.0, 'punch'],
          [  57.4, 'walk'],
          [  57.6, 'knock-down'],
          [  59.0, 'walk'],



          /*
          [  54.9, 'walk'],
          [  56.4, 'punch'],
          [  56.8, 'walk'],
          */
          [ 150.0, 'walk-front'],
        ]}},

        thug2Position:{objRef   : 'thug2Position',tracks:{position:[
          [0,[0,0.5,0]]
        ]}},
        thug2Scale:{objRef      : 'thug2Scale',tracks:{scale:[
          [0,[3.8,3,3]]
        ]}},
        thug2Rotation:{objRef   : 'thug2Rotation',tracks:{rotation:[
          [   0.00, [0, 90,0]],
          [  39.00, [0, 90,0]],
          [  40.00, [0,140,0]],
          [  52.3, [0,90,0]],
          [  53.3, [0,180,0]],
          [  59.6, [0,180,0]],
          [  59.6, [0,130,0]],
          [  60.0, [0,100,0]],
          [  70.0, [0,100,0]],
          
          [ 150.00, [0,90,0]],
        ]}},
        thug2Action:{objRef     : 'thug2Action',tracks:{action:[
          [   0.00, 'walk-front'],
          [  61.1, 'jump-knock'],

          [ 150.00, 'walk-front'],
        ]}},

        thug3Position:{objRef   : 'thug3Position',tracks:{position:[
          [ 0.00,[0,0.5,0]],
          [36.00,[0,0.5,10]],
          [42.00,[0,0.5,0]],
        ]}},
        thug3Scale:{objRef      : 'thug3Scale',tracks:{scale:[
          [0,[3.8,3,3]],
        ]}},
        thug3Rotation:{objRef   : 'thug3Rotation',tracks:{rotation:[
          [   0.0, [0, 90,0]],
          [  39.0, [0, 90,0]],
          [  40.0, [0,140,0]],
          [  52.3, [0,90,0]],
          [  53.3, [0,180,0]],
          [  59.6, [0,180,0]],
          [  59.6, [0,130,0]],
          [  60.0, [0,100,0]],
          [  70.0, [0,100,0]],
        ]}},
        thug3Action:{objRef     : 'thug3Action',tracks:{action:[
          [   0.00, 'walk'],
          [  40.00, 'walk-front'],
          [  61.1, 'jump-knock'],
          
          [ 150.00, 'walk-front'],
        ]}},

        thug4Position:{objRef   : 'thug4Position',tracks:{position:[
          [0,[0,0.5,0]],
        ]}},
        thug4Scale:{objRef      : 'thug4Scale',tracks:{scale:[
          [0,[3.8,3,3]],
        ]}},
        thug4Rotation:{objRef   : 'thug4Rotation',tracks:{rotation:[
          [   0.0, [0,36.328,0]],
          [  53.3, [0,36.328,0]],
          [  79.7, [0,36.328,0]],
          [  79.8, [0,180,0]],

          [  81.5, [0,180,0]],
          [  81.6, [0,240,0]],
          [  85.0, [0,260,0]],

          [ 150.0, [0,260,0]],
        ]}},
        thug4Action:{objRef     : 'thug4Action',tracks:{action:[
          [   0.00, 'walk-front'],
          [  73.70, 'walk-front'],
          [  73.80, 'jump-knock'],
          [  74.00, 'walk-front'],

          
          [ 150.00, 'walk-front'],
        ]}},

        thug5Position:{objRef   : 'thug5Position',tracks:{position:[
          [   0.00,[0,0.5,3]],
          [  35.00,[0,0.5,3]],
          [  36.60,[0,0.5,0]],
          [ 150.00,[0,0.5,0]],
        ]}},
        thug5Scale:{objRef      : 'thug5Scale',tracks:{scale:[
          [0,[3.8,3,3]],
        ]}},
        thug5Rotation:{objRef   : 'thug5Rotation',tracks:{rotation:[
          [   0.0, [0,36.328,0]],
          [  53.3, [0,36.328,0]],

          [ 150.0, [0,90,0]],
        ]}},
        thug5Action:{objRef     : 'thug5Action',tracks:{action:[
          [   0.00, 'walk'],
          [ 149.00, 'walk'],
          [ 150.00, 'walk-front'],
        ]}},
        
      }
    
    }
    
  };

  window.burst.loadJSON(null,null, timeline);

})( window, document );
