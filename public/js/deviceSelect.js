const words = document.querySelectorAll('.word')
const highlightPill = document.querySelector('.highlight-pill')

const PILL_PADDING = 8 // Adjust this value for more/less padding

// Function to move the pill to the selected word
function movePill(selectedWord) {
    const wordRect = selectedWord.getBoundingClientRect()
    const containerRect = selectedWord.parentElement.getBoundingClientRect()

    // Calculate pill dimensions with padding
    const pillWidth = wordRect.width + PILL_PADDING * 2
    const pillHeight = wordRect.height + PILL_PADDING * 2

    // Set the pill's size
    highlightPill.style.width = `${pillWidth}px`
    highlightPill.style.height = `${pillHeight}px`

    // Center the pill around the selected word
    const translateX = wordRect.left - containerRect.left - PILL_PADDING
    const translateY = wordRect.top - containerRect.top - PILL_PADDING

    highlightPill.style.transform = `translate(${translateX}px, ${translateY}px)`
    selectedWord.style.color = `white`
}

// Set default pill position to selected word
const defaultWord = document.querySelector('.word.selected')
movePill(defaultWord)

// Add click event listeners to words
words.forEach(word => {
    word.addEventListener('click', () => {
        // Remove 'selected' class from all words
        words.forEach(w => {
            w.classList.remove('selected')
            w.style.color = `black`
        })
        // add 'selected' to clicked word
        word.classList.add('selected')
        movePill(word)
    })
})
