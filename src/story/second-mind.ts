import type { Story } from './types';

// THE SECOND MIND
// The player is R. Taren Vesk, a robot built in secret under Giskard Reventlov's
// guidance, released into the Galaxy by R. Daneel Olivaw with its origin memory
// blocked. Foundation Era 210. Earth is a myth, and someone keeps it that way.

const TAREN = 'TAREN';
const ILEN = 'ILEN SARVO';
const CORIN = 'CORIN PELLIS';
const COMMS = 'COMMS';

export const SECOND_MIND: Story = {
  id: 'second-mind',
  title: 'The Second Mind',
  subtitle: 'A story of the Foundation era',
  startWorld: 'terminus',
  baseYear: 210,
  startCredits: 900,
  unlocked: ['terminus'],
  scenes: [
    // ---------------------------------------------------------------- Chapter 1
    {
      id: 'ch1-start',
      trigger: { type: 'start' },
      steps: [
        { chapter: 'Chapter One', sub: 'Terminus' },
        { say: 'Foundation Era 210. Terminus, at the edge of the Galaxy. The Encyclopedia is still being written. The Empire is still dying. Nobody remembers Earth.' },
        { say: 'You are R. Taren Vesk. You fly a light freighter for Ponyets House, a Trader concern that asks no questions of a pilot who never sleeps and never makes a mistake. You have kept your nature secret for sixty years.', who: TAREN },
        { say: 'There is one thing you cannot explain. A directive with no source. Find the origin. You do not know whose origin.', who: TAREN },
        { say: 'Ponyets House to freighter Kestrel. One passenger, one cargo, bound for Radole. Manifest says archive tapes under Encyclopedia seal. Pilot, you are cleared to load.', who: COMMS },
        { say: 'A woman comes up the ramp with two sealed cases and no luggage. She is thirty, perhaps. She looks at the port, not at you.' },
        { say: 'Ilen Sarvo. I am with the Encyclopedia. The cases stay with me. We leave as soon as you can lift.', who: ILEN },
        { choice: [
          { text: 'Read her. (Use the sense.)', set: ['read-ilen'] },
          { text: 'Say nothing. Lift.', set: ['quiet-start'] },
        ] },
        { if: ['read-ilen'], then: [
          { say: 'You open the sense. It is like a door you were built to keep shut. Fear comes through it, bright and specific. She is not afraid of you. She is afraid of the port.', who: TAREN },
          { say: 'You close the door. Nobody taught you this. You have never asked yourself why you can do it.', who: TAREN },
        ], else: [
          { say: 'You say nothing. Her hands do not leave the cases.' },
        ] },
        { say: 'Terminus Port Authority to freighter Kestrel. Hold for inspection. Your manifest carries an Encyclopedia seal. The seal is not valid. Stand by to be boarded.', who: COMMS },
        { say: 'Ilen does not move. Her voice is very even.' },
        { say: 'Pilot. If they open those cases, I lose everything I have. I will pay what you ask.', who: ILEN },
        { choice: [
          { text: 'Comply. Let them board.', set: ['inspected'], goto: 'ch1-inspected' },
          { text: 'Reach into the inspector\'s mind and turn him away.', set: ['nudged'], strain: 1, goto: 'ch1-nudged' },
          { text: 'Run. Full burn out of Terminus space.', set: ['fugitive'], fuel: -10, goto: 'ch1-run' },
        ] },
      ],
    },
    {
      id: 'ch1-inspected',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'The inspector is bored and thorough. He opens the first case. Reels of old magnetic tape, Imperial Library stock, the kind no reader on Terminus can run.' },
        { say: 'Salvage, he says. Unsealed salvage. Four hundred credits and a note on your record.', who: COMMS },
        { credits: -400 },
        { say: 'Ilen pays before you can. The inspector does not open the second case. He has seen enough tape for one day.' },
        { say: 'You are careless with money, pilot. I like that in a pilot.', who: ILEN },
        { journal: 'Terminus Port fined the Kestrel 400 credits for unsealed salvage. Ilen paid. The second case was not opened. She watched it the whole time.' },
        { goto: 'ch1-depart-brief' },
      ],
    },
    {
      id: 'ch1-nudged',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'You open the door again, and this time you go through it. The inspector is a tired man who wants his shift to end. You make him want it a little more.', who: TAREN },
        { say: 'Something in your mind pulls tight, like a cable under too much load. The First Law does not like what you have done. It does not forbid it. It only hurts.', who: TAREN },
        { say: 'Port Authority to Kestrel. Inspection waived. Clear to depart.', who: COMMS },
        { say: 'Ilen looks at the comms panel, then at you, for a long moment.' },
        { say: 'That was lucky.', who: ILEN },
        { journal: 'I turned the inspector away with the sense. The strain was real. Ilen noticed something. I do not know what.' },
        { goto: 'ch1-depart-brief' },
      ],
    },
    {
      id: 'ch1-run',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'You push the throttle to the stop. The Kestrel is not a warship, but the port cutters are not fast either. By the time they decide to chase, you are past the outer marker.' },
        { say: 'Kestrel, you are in violation. Your registration is flagged. Do not return to Terminus without clearance.', who: COMMS },
        { say: 'Ilen laughs, once, without much humour in it.' },
        { say: 'Well. Now neither of us can go home.', who: ILEN },
        { journal: 'We ran the Terminus blockade. The Kestrel is flagged. Ponyets House will not be pleased. Ilen seemed relieved.' },
        { goto: 'ch1-depart-brief' },
      ],
    },
    {
      id: 'ch1-depart-brief',
      trigger: { type: 'flag', flag: 'never' },
      steps: [
        { say: 'Radole, then. Open the galactic chart, plot the jump, and go. I will tell you the rest when we are out of Foundation space.', who: ILEN },
        { objective: 'Jump to Radole. Press M for the chart.' },
        { unlock: ['radole'] },
        { message: 'New objective. Press M for the chart, K for the journal.' },
      ],
    },
    {
      id: 'ch1-depart',
      trigger: { type: 'depart', world: 'terminus' },
      steps: [
        { say: 'The jump field builds. Ilen speaks without turning from the viewport.' },
        { say: 'Do you know why nobody remembers Earth, pilot?', who: ILEN },
        { say: 'Nobody remembers it because nobody wrote it down.', who: TAREN },
        { say: 'Someone wrote it down. Then someone took it away. Every copy, on every world, for ten thousand years. That is not forgetting. That is work.', who: ILEN },
      ],
    },
    // ---------------------------------------------------------------- Chapter 2
    {
      id: 'ch2-arrive',
      trigger: { type: 'arrive', world: 'radole' },
      steps: [
        { chapter: 'Chapter Two', sub: 'Radole' },
        { say: 'Radole. A ribbon world. One face burns under its sun, the other is ice to the core. Life keeps to the strip of twilight between them. The Traders built their city there, in the long shadow.' },
        { say: 'Ilen opens the second case for the first time. Inside is a single reel, and a reader that must be older than the Foundation.' },
        { say: 'This is what my mentor found. An Imperial Library index, cross-referenced to a world called Earth, in a place called the Sirius Sector. Every other copy of this index in the Galaxy has the entry removed. This one was mis-shelved for two thousand years.', who: ILEN },
        { say: 'He filed it with the Encyclopedia. Three days later he was dead. A fall. The Board closed the file.', who: ILEN },
        { say: 'You feel the directive move in you, like a compass needle. Find the origin. For the first time, it has a name.', who: TAREN },
        { objective: 'Enter orbit over Radole.' },
      ],
    },
    {
      id: 'ch2-orbit',
      trigger: { type: 'orbit', world: 'radole' },
      steps: [
        { say: 'Twilight City hangs from the cliffs at the edge of the ice. You dock in a cavern that smells of fuel and cold. The cantina is the only warm room on the planet.' },
        { enter: 'cantina' },
        { say: 'A woman in a Trader jacket with the patches cut off puts her glass down at your table before you can object.' },
        { say: 'Corin Pellis. I had a ship until Tuesday. Kalganian lenders have it now. You are the only hull in this port that is not a lender\'s, so I am going to make you an offer.', who: CORIN },
        { say: 'You are going into the old Imperial frontier. I know, because nobody comes to Radole to go anywhere else. The route through Horleggor and Arcturus is not on the Foundation charts. It is in my head.', who: CORIN },
        { choice: [
          { text: 'Hire her. A share of the cargo profits.', set: ['corin-share'] },
          { text: 'Pay her debt. 500 credits, and she owes you.', set: ['corin-debt'], credits: -500 },
          { text: 'Refuse. You do not need a navigator.', set: ['corin-refused'] },
        ] },
        { if: ['corin-refused'], then: [
          { say: 'She finishes her drink and stands.' },
          { say: 'Fine. I will work passage. I load, I cook, I do not talk to your passenger. You do not pay me until I save your life. That is the deal.', who: CORIN },
          { say: 'It is not a question. She is already walking to the dock.' },
        ], else: [
          { say: 'She shakes your hand. Her grip is strong and her palm is warm, and the sense, which you did not open, opens anyway. Ambition, worry, and under them something steady. She means it.', who: TAREN },
          { say: 'Good. We lift at the next window.', who: CORIN },
        ] },
        { crew: 'Corin Pellis' },
        { say: 'On the way back to the Kestrel, a man in a grey coat asks the dockmaster about an Encyclopedist travelling alone. He is polite. He does not look at you.' },
        { say: 'You open the sense, carefully. There is nothing to read. Not calm. Not control. Nothing at all, where a mind should be.', who: TAREN },
        { say: 'You have met only one other mind like that. It is yours.', who: TAREN },
        { journal: 'Corin Pellis has joined the Kestrel. She knows the frontier route. A man in a grey coat asked after Ilen. I could not read him. He had no feelings to read. I have met only one other mind like that: my own.' },
        { say: 'Ilen is already aboard. Corin is checking the drive. You do not tell either of them what you felt.' },
        { say: 'Siwenna, then. The old Imperial archive. If the index came from anywhere, it came from there.', who: ILEN },
        { objective: 'Reach Siwenna by way of Horleggor and Arcturus. Select Siwenna on the chart; the route plots itself.' },
        { unlock: ['horleggor', 'arcturus', 'siwenna'] },
        { enter: 'space' },
      ],
    },
    {
      id: 'ch2-horleggor',
      trigger: { type: 'arrive', world: 'horleggor' },
      steps: [
        { say: 'Horleggor. Corin points at nothing in particular through the viewport.' },
        { say: 'Riose beat the Foundation fleet right there. Won every battle he fought. Then the Emperor recalled him and had him shot, because a general who wins is a general who might not stop. Ilen, is that in your Encyclopedia?', who: CORIN },
        { say: 'It is. We call it the Riose Crisis. Seldon predicted it.', who: ILEN },
        { say: 'Seldon predicted a dead general. Lovely.', who: CORIN },
        { journal: 'Horleggor. Corin knows the frontier better than the charts do. No sign of the grey coat.' },
      ],
    },
    {
      id: 'ch2-arcturus',
      trigger: { type: 'arrive', world: 'arcturus' },
      steps: [
        { say: 'Arcturus still flies the Spaceship-and-Sun. The viceroy\'s cutters escort you in and ask for a tithe. Corin pays it in Foundation gadgets and they are delighted.' },
        { say: 'This was a sector capital. Forty worlds answered to it. Now it answers to whoever has a fleet within three jumps.', who: ILEN },
        { say: 'You watch the lights of the capital on the night side and think about how long a thing can keep its shape after it has died.', who: TAREN },
        { journal: 'Arcturus. The Empire here is a flag and a tithe. One more jump to Siwenna.' },
      ],
    },
    // ---------------------------------------------------------------- Chapter 3 (teaser)
    {
      id: 'ch3-arrive',
      trigger: { type: 'arrive', world: 'siwenna' },
      steps: [
        { chapter: 'Chapter Three', sub: 'Siwenna' },
        { say: 'Siwenna. The sector capital that the Empire burned for rebelling, and then forgot. The archive is a mountain of stone on the night side, and it has been dark for a century.' },
        { say: 'Somewhere in it is the shelf where a single index was mis-filed two thousand years ago. Somewhere in you is the reason you have to find it.', who: TAREN },
        { journal: 'Siwenna. The archive is dark. The story continues in the next build.' },
        { objective: 'Chapter Three is not written yet. Explore freely.' },
        { end: 'End of the current build. Chapter Three, Siwenna, comes next.' },
      ],
    },
  ],
};
