# F# Core on Mac

TL;DR: A basic hello world program in F# takes 6+ seconds to compile on my relatively modern macbook pro. The equivalent rust program compiles in significantly less than a second.

I put [dotnet core](https://www.microsoft.com/net/core#macos) on my laptop this weekend and just started tinkering. It’s been 2 years since I last professionally wrote any .NET, and I have to say I’ve kinda missed it!

Getting set up was really easy, and starting a new F# project was as simple as `dotnet new --lang f#`.

This gave me a hello world program that roughly resembled this:

```f#
open System

[<EntryPoint>]
let main args =
    printfn "Hello World!"
    printfn "%A" args
    0 // return an integer exit code
Sadly, this took over 5 seconds to build on my snappy Macbook…
```

F# core compilation:

```
time dotnet build
real  0m6.326s
user  0m5.730s
sys 0m0.693s
```

Mono’s F# compilation fared better:

```
time fsharpc -o hi.exe Program.fs
real  0m2.655s
user  0m2.393s
sys 0m0.146s
```

And the equivalent C# dotnet core build:

```
real  0m2.407s
user  0m1.705s
sys 0m0.298s
```

Just for a comparison, the equivalent rust program compiles in well under a second:

```
real    0m0.146s
user    0m0.104s
sys 0m0.036s
```

So, F# still seems to be .NET’s redheaded step child, taking roughly 2.6x longer than C#. C#, meanwhile, takes 12x longer than rust.

This makes me sad, as .NET is really a great platform, and F# is a really good language. But these compilation times seem kinda crazy to me. I suspect they’d have a large netgative impact on the kinds o f exploratory coding I do in JavaScript and Ruby these days.