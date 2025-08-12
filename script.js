document.addEventListener('DOMContentLoaded', () => {
    const emojisContainer = document.querySelector('.emojis');
    const headlinesContainer = document.querySelector('.headlines');

    const pairs = [
        {
            headline: ["", ""],
            emojis: [
                { emoji: "🎨💺🎂", word: "ARTCHAIRCAKE" },
            ]
        },
        {
            headline: ["T", " the ", "", ""],
            emojis: [
                { emoji: "🫏🔉2️⃣", word: "HAW" },
                { emoji: "🧕", word: "CHICK" },
                { emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿💬🧑‍💻⌨️", word: "EN" }
            ]
        },
        {
            headline: ["", ""],
            emojis: [
                { emoji: "🎨💺🎂", word: "PAINTSEATBIRTHDAY" },
            ]
        }
    ];

    const allEmojis = pairs.flatMap(p => p.emojis);

    // Shuffle the emojis for the emoji container
    const shuffledEmojis = [...allEmojis].sort(() => Math.random() - 0.5);

    shuffledEmojis.forEach((emojiObj, index) => {
        const emojiCard = document.createElement('div');
        emojiCard.classList.add('emoji-card');
        emojiCard.draggable = true;
        const word = emojiObj.word
        emojiCard.id = `emoji-${word}`;
        emojiCard.textContent = emojiObj.emoji;
        emojisContainer.appendChild(emojiCard);
    });

    pairs.forEach((pair, headlineIndex) => {
        const headlineCard = document.createElement('div');
        headlineCard.classList.add('headline-card');
        headlineCard.id = `headline-${headlineIndex}`;

        pair.headline.forEach((part, partIndex) => {
            const textNode = document.createTextNode(part);
            headlineCard.appendChild(textNode);

            if (partIndex < pair.headline.length - 1) {
                const emojiSlot = document.createElement('span');
                emojiSlot.classList.add('emoji-slot');
                emojiSlot.dataset.headlineId = headlineIndex;
                emojiSlot.dataset.slotIndex = partIndex;
                
                // Set the underscores based on the word length
                const wordLength = pair.emojis[partIndex].word.length;
                emojiSlot.textContent = "_ ".repeat(wordLength);

                headlineCard.appendChild(emojiSlot);
            }
        });
        headlinesContainer.appendChild(headlineCard);
    });

    let draggedEmojiId = null;

    emojisContainer.addEventListener('dragstart', (e) => {
        draggedEmojiId = e.target.id;
        e.dataTransfer.setData('text/plain', draggedEmojiId);
    });

    headlinesContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dropZone = e.target.closest('.emoji-slot');
        if (dropZone && !dropZone.classList.contains('filled')) {
            dropZone.classList.add('drag-over');
        }
    });

    headlinesContainer.addEventListener('dragleave', (e) => {
        const dropZone = e.target.closest('.emoji-slot');
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
    });

    headlinesContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropZone = e.target.closest('.emoji-slot');

        if (dropZone && !dropZone.classList.contains('filled')) {
            dropZone.classList.remove('drag-over');
            const headlineId = dropZone.dataset.headlineId;
            const slotIndex = dropZone.dataset.slotIndex;
            const droppedEmojiText = document.getElementById(draggedEmojiId).textContent;
            const word = document.getElementById(draggedEmojiId).id.replace('emoji-', '')
            
            if (pairs[headlineId].emojis[slotIndex].emoji === droppedEmojiText) {
                // Correct match
                console.log(word)
		console.log( pairs[headlineId].emojis[slotIndex].word)
		if (word != pairs[headlineId].emojis[slotIndex].word) {
                    console.log("not match")
	       	    dropZone.textContent = pairs[headlineId].emojis[slotIndex].word
                } else {
                dropZone.textContent = word;
		}
		dropZone.classList.add('filled');
                document.getElementById(draggedEmojiId).classList.add('hide');

                const allSlots = document.querySelectorAll(`[data-headline-id="${headlineId}"]`);
                const allFilled = Array.from(allSlots).every(slot => slot.classList.contains('filled'));
                if (allFilled) {
                    document.getElementById(`headline-${headlineId}`).classList.add('match');
                }
            } else {
                // Incorrect match: flash red
                dropZone.classList.add('flash-red');
                setTimeout(() => {
                    dropZone.classList.remove('flash-red');
                }, 500);
            }
        }
        draggedEmojiId = null;
    });
});


