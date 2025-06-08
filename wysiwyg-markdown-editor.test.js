const MarkdownEditor = require('./wysiwyg-markdown-editor'); // Assuming your class is exported
const { marked } = require('marked');
const TurndownService = require('turndown');

// Mock the MarkdownEditor to prevent DOM interactions while testing conversion logic
jest.mock('./wysiwyg-markdown-editor', () => {
  const ActualMarkdownEditor = jest.requireActual('./wysiwyg-markdown-editor');
  const { marked: actualMarked } = jest.requireActual('marked'); // Get actual marked

  // Create a mock constructor
  return jest.fn().mockImplementation((editorId, options) => {
    // Create an object that mimics the relevant parts of an editor instance
    const mockInstance = {
      options: options || {},
      editorElement: null, // No real DOM element in Node environment for these tests
      turndownService: null, // Will be initialized
      // --- Mock methods that interact with DOM or are not under test ---
      _initEventListeners: jest.fn(),
      _setCursor: jest.fn(),
      _setCursorInElement: jest.fn(),
      _getTextContentFromNode: jest.fn(node => node ? node.textContent : ''), // Simplified
      _handleInput: jest.fn(),
      _handleKeydown: jest.fn(),
      // --- Actual methods we want to test or that configure services ---
      // _configureMarked and _initTurndown are called by the actual constructor.
      // We need to call them manually here on our mockInstance.
      // We also need to provide the 'this' context they expect.
    };

    // Simulate editorElement for constructor parts that might use it minimally
    mockInstance.editorElement = {
        setAttribute: jest.fn(),
        addEventListener: jest.fn(),
        innerHTML: '',
        // Mock other properties if constructor/methods use them
        style: {},
        classList: { add: jest.fn(), remove: jest.fn() },
    };

    // Call the actual configuration methods using the mockInstance as 'this'
    ActualMarkdownEditor.prototype._configureMarked.call(mockInstance);
    ActualMarkdownEditor.prototype._initTurndown.call(mockInstance);

    // Expose the _convertToMarkdown method from the actual prototype, bound to our mockInstance
    mockInstance._convertToMarkdown = ActualMarkdownEditor.prototype._convertToMarkdown.bind(mockInstance);

    return mockInstance;
  });
});


describe('Markdown Conversion Utilities', () => {
  let editor; // This will be the mocked editor instance

  beforeAll(() => {
    // 'marked' is configured globally by _configureMarked when the mocked editor is instantiated.
    // 'turndownService' is configured on the instance by _initTurndown.
    editor = new MarkdownEditor('mock-editor-id');
  });

  describe('Markdown to HTML (using globally configured marked)', () => {
    // The _configureMarked method from MarkdownEditor is called during mock instantiation,
    // which sets global options for the actual 'marked' library.
    test('should convert # Heading 1 to <h1 dir="auto">Heading 1</h1>', () => {
      expect(marked('# Heading 1').trim()).toBe('<h1 dir="auto" id="heading-1">Heading 1</h1>');
    });

    test('should convert **bold text** to <p dir="auto"><strong>bold text</strong></p>', () => {
      expect(marked('**bold text**').trim()).toBe('<p dir="auto"><strong>bold text</strong></p>');
    });

    test('should convert *italic text* to <p dir="auto"><em>italic text</em></p>', () => {
      expect(marked('*italic text*').trim()).toBe('<p dir="auto"><em>italic text</em></p>');
    });

    test('should convert a list to <ul dir="auto"><li>item</li></ul>', () => {
      const md = '* item';
      const expectedHtml = '<ul dir="auto">\n<li dir="auto">item</li>\n</ul>';
      expect(marked(md).replace(/\n\s*/g, '\n')).toBe(expectedHtml.replace(/\n\s*/g, '\n'));
    });

    test('should convert blockquote to <blockquote dir="auto"><p dir="auto">quote</p></blockquote>', () => {
        const md = '> quote';
        expect(marked(md).trim()).toBe('<blockquote dir="auto">\n<p dir="auto">quote</p>\n</blockquote>');
    });
  });

  describe('HTML to Markdown (using editor\'s turndown instance)', () => {
    // The mocked editor instance `editor` has `this.turndownService` initialized by _initTurndown.
    // We test the `_convertToMarkdown` method which uses this service.
    test('should convert <h1 dir="auto" id="heading-1">Heading 1</h1> to # Heading 1', () => {
      expect(editor._convertToMarkdown('<h1 dir="auto" id="heading-1">Heading 1</h1>').trim()).toBe('# Heading 1');
    });

    test('should convert <p dir="auto"><strong>bold text</strong></p> to **bold text**', () => {
      expect(editor._convertToMarkdown('<p dir="auto"><strong>bold text</strong></p>').trim()).toBe('**bold text**');
    });

    test('should convert <p dir="auto"><em>italic text</em></p> to *italic text*', () => {
      expect(editor._convertToMarkdown('<p dir="auto"><em>italic text</em></p>').trim()).toBe('*italic text*');
    });

    test('should convert <ul dir="auto"><li dir="auto">item</li></ul> to * item', () => {
      expect(editor._convertToMarkdown('<ul dir="auto"><li dir="auto">item</li></ul>').trim()).toBe('* item');
    });

     test('should convert <blockquote dir="auto"><p dir="auto">quote</p></blockquote> to > quote', () => {
      expect(editor._convertToMarkdown('<blockquote dir="auto"><p dir="auto">quote</p></blockquote>').trim()).toBe('> quote');
    });
  });

  describe('Newline and Paragraph Handling (Conceptual via Markdown/HTML utilities)', () => {
    test('Marked: multiple lines of text should become separate paragraphs', () => {
      const md = 'First line.\n\nSecond line.';
      // Marked wraps separate lines (separated by double newline) in <p> tags
      const expectedHtml = '<p dir="auto">First line.</p>\n<p dir="auto">Second line.</p>';
      expect(marked(md).trim()).toBe(expectedHtml);
    });

    test('Marked: single newline (soft break) without breaks:true should be a space', () => {
      const md = 'First line.\nSecond line.';
      // With breaks: false (default in our config), single newline is treated as space or joined.
      // The exact output depends on context, often <p dir="auto">First line. Second line.</p>
      // If marked.options.breaks was true, it would be <p dir="auto">First line.<br>Second line.</p>
      const expectedHtml = '<p dir="auto">First line.\nSecond line.</p>'; // Marked joins them with a \n in the text node
      expect(marked(md).trim()).toBe(expectedHtml);
    });

    test('Turndown: multiple <p> tags should convert to text separated by double newlines', () => {
      const html = '<p dir="auto">First paragraph.</p><p dir="auto">Second paragraph.</p>';
      // Turndown should add two newlines between paragraphs.
      expect(editor._convertToMarkdown(html).trim()).toBe('First paragraph.\n\nSecond paragraph.');
    });

    test('Turndown: <br> tags within a paragraph (if kept by a rule) should become single newlines', () => {
      const html = '<p dir="auto">Line one<br>Line two</p>';
      // Default Turndown converts <br> to a newline character.
      // editor._convertToMarkdown already uses a Turndown instance.
      // We need to ensure the instance's rules are what we expect for <br>.
      // The default Turndown behavior is usually to convert <br> to \n.
      const localTurndown = new TurndownService(); // Test default behavior
      expect(localTurndown.turndown(html).trim()).toBe("Line one\nLine two");

      // If we had a rule to keep <br> as <br> (e.g. for GFM line breaks)
      // const gfmTurndown = new TurndownService({}).keep(['br']);
      // expect(gfmTurndown.turndown(html).trim()).toBe("Line one<br />\nLine two");
      // For now, we test the default which is \n
    });
  });
});

// No specific global mocks for document/window needed at the bottom anymore,
// as the editor instance itself is mocked, preventing direct DOM access in tests.
// The core 'marked' and 'turndown' libraries operate on strings and don't require a live DOM.
