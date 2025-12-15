# Ruby's Open Struct's Slow Performance

Ruby’s OpenStruct is slow, but convenient. I wanted something similar. My requirements:

- Define a read-only property bag of any shape to describe events
- Avoid having to deal with concrete classes per event type
- Be able to access the properties as if they belonged to a concrete class
Fast

The conclusion is that OpenStruct is really slow, but it’s possible to to create a similar object with really good perf. Here's a gist of my tests/results:

{% gist fb1ea90afdb226e28b6d7b984acbc727 %}