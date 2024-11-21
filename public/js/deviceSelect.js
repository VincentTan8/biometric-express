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

// Function to set the ip of biometrics device
async function changeIP(company) {
    // Prepare data to send
    const data = { company }
    try {
        // Send POST request using fetch
        const response = await fetch('/api/changeIP', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        // Handle the response
        const result = await response.json()
        document.getElementById('status').appendChild(document.createTextNode(result.result+`\n`))
    } catch (error) {
        console.error('Error:', error)
        document.getElementById('status').textContent = 'Failed to change IP'
    }
}

//for the css and js to properly load on first go
window.onload = () => {
    // Set default pill position to selected word
    const defaultWord = document.querySelector('.word.selected')
    changeIP(defaultWord.id)
    if (defaultWord) {
        movePill(defaultWord)
    }
}

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
        changeIP(word.id)
        movePill(word)
    })
})