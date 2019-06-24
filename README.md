# MakeEPromiseClass

[![Build Status][circleci-svg]][circleci-url]
[![dependency status][deps-svg]][deps-url]
[![dev dependency status][dev-deps-svg]][dev-deps-url]
[![License][license-image]][license-url]

[![Promises/A+ 1.1 compliant][aplus-logo]][aplus-url] Promises/A+ 1.1 compliant

Create a class which implements the eventual-send Promise API.  This API is used by the ECMAScript infix-bang proposal.

## How to use

> Note: If you're writing an application, you probably don't want to use this package directly. You'll want to use the eventual-send `!` operator (infix bang) provided in [SES](https://github.com/Agoric/SES) or other platforms.

The created `EPromise` class can be used as described in `test/test.js`.

## Creating a custom EPromise Class

This package (`@agoric/eventual-send`) provides a `makeEPromiseClass()` which can be used to build your own `EPromise` class. When you call `makeEPromiseClass()`, you give it an underlying `Promise` class that is inherited and augmented with eventual-send methods.

You can create an `EPromise` class from any existing Promises/A+ implementation, including the ECMAScript 6 and later `Promise` implementation.

[aplus-url]: https://promisesaplus.com/
[aplus-logo]: https://promisesaplus.com/assets/logo-small.png
[circleci-svg]: https://circleci.com/gh/Agoric/eventual-send.svg?style=svg
[circleci-url]: https://circleci.com/gh/Agoric/eventual-send
[deps-svg]: https://david-dm.org/Agoric/eventual-send.svg
[deps-url]: https://david-dm.org/Agoric/eventual-send
[dev-deps-svg]: https://david-dm.org/Agoric/eventual-send/dev-status.svg
[dev-deps-url]: https://david-dm.org/Agoric/eventual-send?type=dev
[license-image]: https://img.shields.io/badge/License-Apache%202.0-blue.svg
[license-url]: LICENSE
