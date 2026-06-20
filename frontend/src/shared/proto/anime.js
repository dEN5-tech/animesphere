/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $TypeError = $util.global.TypeError, $Number = $util.global.Number, $String = $util.global.String, $Array = $util.global.Array;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const anime = $root.anime = (() => {

    /**
     * Namespace anime.
     * @exports anime
     * @namespace
     */
    const anime = {};

    anime.AnimeService = (function() {

        /**
         * Constructs a new AnimeService service.
         * @memberof anime
         * @classdesc Represents an AnimeService
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        const AnimeService = function(rpcImpl, requestDelimited, responseDelimited) {
            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        };

        (AnimeService.prototype = $Object.create($protobuf.rpc.Service.prototype)).constructor = AnimeService;

        /**
         * Creates new AnimeService service using the specified rpc implementation.
         * @function create
         * @memberof anime.AnimeService
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {AnimeService} RPC service. Useful where requests and/or responses are streamed.
         */
        AnimeService.create = function(rpcImpl, requestDelimited, responseDelimited) {
            return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link anime.AnimeService#getAnimeList}.
         * @memberof anime.AnimeService
         * @typedef GetAnimeListCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {anime.AnimeListResponse} [response] AnimeListResponse
         */

        /**
         * Calls GetAnimeList.
         * @memberof anime.AnimeService
         * @typedef GetAnimeList
         * @type {{
         *   (request: anime.IEmpty, callback: anime.AnimeService.GetAnimeListCallback): void;
         *   (request: anime.IEmpty): Promise<anime.AnimeListResponse>;
         *   readonly name: "GetAnimeList";
         *   readonly path: "/anime.AnimeService/GetAnimeList";
         *   readonly requestType: "Empty";
         *   readonly responseType: "AnimeListResponse";
         *   readonly requestStream: undefined;
         *   readonly responseStream: undefined;
         * }}
         */

        /**
         * Calls GetAnimeList.
         * @name anime.AnimeService#getAnimeList
         * @type {anime.AnimeService.GetAnimeList}
         */
        $Object.defineProperties(AnimeService.prototype.getAnimeList = function(request, callback) {
            return $protobuf.rpc.Service.prototype.rpcCall.call(this, AnimeService.prototype.getAnimeList, $root.anime.Empty, $root.anime.AnimeListResponse, request, callback);
        }, {
            name: { value: "GetAnimeList" },
            path: { value: "/anime.AnimeService/GetAnimeList" },
            requestType: { value: "Empty" },
            responseType: { value: "AnimeListResponse" },
            requestStream: { value: $undefined },
            responseStream: { value: $undefined }
        });

        /**
         * Callback as used by {@link anime.AnimeService#getAnimeStreams}.
         * @memberof anime.AnimeService
         * @typedef GetAnimeStreamsCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {anime.StreamResponse} [response] StreamResponse
         */

        /**
         * Calls GetAnimeStreams.
         * @memberof anime.AnimeService
         * @typedef GetAnimeStreams
         * @type {{
         *   (request: anime.IStreamRequest, callback: anime.AnimeService.GetAnimeStreamsCallback): void;
         *   (request: anime.IStreamRequest): Promise<anime.StreamResponse>;
         *   readonly name: "GetAnimeStreams";
         *   readonly path: "/anime.AnimeService/GetAnimeStreams";
         *   readonly requestType: "StreamRequest";
         *   readonly responseType: "StreamResponse";
         *   readonly requestStream: undefined;
         *   readonly responseStream: undefined;
         * }}
         */

        /**
         * Calls GetAnimeStreams.
         * @name anime.AnimeService#getAnimeStreams
         * @type {anime.AnimeService.GetAnimeStreams}
         */
        $Object.defineProperties(AnimeService.prototype.getAnimeStreams = function(request, callback) {
            return $protobuf.rpc.Service.prototype.rpcCall.call(this, AnimeService.prototype.getAnimeStreams, $root.anime.StreamRequest, $root.anime.StreamResponse, request, callback);
        }, {
            name: { value: "GetAnimeStreams" },
            path: { value: "/anime.AnimeService/GetAnimeStreams" },
            requestType: { value: "StreamRequest" },
            responseType: { value: "StreamResponse" },
            requestStream: { value: $undefined },
            responseStream: { value: $undefined }
        });

        return AnimeService;
    })();

    anime.Empty = (function() {

        /**
         * Properties of an Empty.
         * @typedef {Object} anime.Empty.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an Empty.
         * @memberof anime
         * @interface IEmpty
         * @augments anime.Empty.$Properties
         * @deprecated Use anime.Empty.$Properties instead.
         */

        /**
         * Shape of an Empty.
         * @typedef {anime.Empty.$Properties} anime.Empty.$Shape
         */

        /**
         * Constructs a new Empty.
         * @memberof anime
         * @classdesc Represents an Empty.
         * @constructor
         * @param {anime.Empty.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Empty = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Creates a new Empty instance using the specified properties.
         * @function create
         * @memberof anime.Empty
         * @static
         * @param {anime.Empty.$Properties=} [properties] Properties to set
         * @returns {anime.Empty} Empty instance
         * @type {{
         *   (properties: anime.Empty.$Shape): anime.Empty & anime.Empty.$Shape;
         *   (properties?: anime.Empty.$Properties): anime.Empty;
         * }}
         */
        Empty.create = function(properties) {
            return new Empty(properties);
        };

        /**
         * Encodes the specified Empty message. Does not implicitly {@link anime.Empty.verify|verify} messages.
         * @function encode
         * @memberof anime.Empty
         * @static
         * @param {anime.Empty.$Properties} message Empty message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Empty.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Empty message, length delimited. Does not implicitly {@link anime.Empty.verify|verify} messages.
         * @function encodeDelimited
         * @memberof anime.Empty
         * @static
         * @param {anime.Empty.$Properties} message Empty message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Empty.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an Empty message from the specified reader or buffer.
         * @function decode
         * @memberof anime.Empty
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {anime.Empty & anime.Empty.$Shape} Empty
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Empty.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.anime.Empty();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                reader.skipType(tag & 7, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an Empty message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof anime.Empty
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {anime.Empty & anime.Empty.$Shape} Empty
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Empty.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Empty message.
         * @function verify
         * @memberof anime.Empty
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Empty.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            return null;
        };

        /**
         * Creates an Empty message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof anime.Empty
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {anime.Empty} Empty
         */
        Empty.fromObject = function (object, _depth) {
            if (object instanceof $root.anime.Empty)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".anime.Empty: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            return new $root.anime.Empty();
        };

        /**
         * Creates a plain object from an Empty message. Also converts values to other types if specified.
         * @function toObject
         * @memberof anime.Empty
         * @static
         * @param {anime.Empty} message Empty
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Empty.toObject = function () {
            return {};
        };

        /**
         * Converts this Empty to JSON.
         * @function toJSON
         * @memberof anime.Empty
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Empty.prototype.toJSON = function() {
            return Empty.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Empty
         * @function getTypeUrl
         * @memberof anime.Empty
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Empty.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/anime.Empty";
        };

        return Empty;
    })();

    anime.Anime = (function() {

        /**
         * Properties of an Anime.
         * @typedef {Object} anime.Anime.$Properties
         * @property {number|null} [id] Anime id
         * @property {string|null} [title] Anime title
         * @property {string|null} [description] Anime description
         * @property {string|null} [coverImage] Anime coverImage
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an Anime.
         * @memberof anime
         * @interface IAnime
         * @augments anime.Anime.$Properties
         * @deprecated Use anime.Anime.$Properties instead.
         */

        /**
         * Shape of an Anime.
         * @typedef {anime.Anime.$Properties} anime.Anime.$Shape
         */

        /**
         * Constructs a new Anime.
         * @memberof anime
         * @classdesc Represents an Anime.
         * @constructor
         * @param {anime.Anime.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Anime = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Anime id.
         * @member {number} id
         * @memberof anime.Anime
         * @instance
         */
        Anime.prototype.id = 0;

        /**
         * Anime title.
         * @member {string} title
         * @memberof anime.Anime
         * @instance
         */
        Anime.prototype.title = "";

        /**
         * Anime description.
         * @member {string} description
         * @memberof anime.Anime
         * @instance
         */
        Anime.prototype.description = "";

        /**
         * Anime coverImage.
         * @member {string} coverImage
         * @memberof anime.Anime
         * @instance
         */
        Anime.prototype.coverImage = "";

        /**
         * Creates a new Anime instance using the specified properties.
         * @function create
         * @memberof anime.Anime
         * @static
         * @param {anime.Anime.$Properties=} [properties] Properties to set
         * @returns {anime.Anime} Anime instance
         * @type {{
         *   (properties: anime.Anime.$Shape): anime.Anime & anime.Anime.$Shape;
         *   (properties?: anime.Anime.$Properties): anime.Anime;
         * }}
         */
        Anime.create = function(properties) {
            return new Anime(properties);
        };

        /**
         * Encodes the specified Anime message. Does not implicitly {@link anime.Anime.verify|verify} messages.
         * @function encode
         * @memberof anime.Anime
         * @static
         * @param {anime.Anime.$Properties} message Anime message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Anime.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.id);
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.title);
            if (message.description != null && $Object.hasOwnProperty.call(message, "description"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.description);
            if (message.coverImage != null && $Object.hasOwnProperty.call(message, "coverImage"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.coverImage);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Anime message, length delimited. Does not implicitly {@link anime.Anime.verify|verify} messages.
         * @function encodeDelimited
         * @memberof anime.Anime
         * @static
         * @param {anime.Anime.$Properties} message Anime message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Anime.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an Anime message from the specified reader or buffer.
         * @function decode
         * @memberof anime.Anime
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {anime.Anime & anime.Anime.$Shape} Anime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Anime.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.anime.Anime(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.int32())
                            message.id = value;
                        else
                            delete message.id;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.title = value;
                        else
                            delete message.title;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.description = value;
                        else
                            delete message.description;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.coverImage = value;
                        else
                            delete message.coverImage;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an Anime message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof anime.Anime
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {anime.Anime & anime.Anime.$Shape} Anime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Anime.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Anime message.
         * @function verify
         * @memberof anime.Anime
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Anime.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                if (!$util.isInteger(message.id))
                    return "id: integer expected";
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.description != null && $Object.hasOwnProperty.call(message, "description"))
                if (!$util.isString(message.description))
                    return "description: string expected";
            if (message.coverImage != null && $Object.hasOwnProperty.call(message, "coverImage"))
                if (!$util.isString(message.coverImage))
                    return "coverImage: string expected";
            return null;
        };

        /**
         * Creates an Anime message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof anime.Anime
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {anime.Anime} Anime
         */
        Anime.fromObject = function (object, _depth) {
            if (object instanceof $root.anime.Anime)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".anime.Anime: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.anime.Anime();
            if (object.id != null)
                if ($Number(object.id) !== 0)
                    message.id = object.id | 0;
            if (object.title != null)
                if (typeof object.title !== "string" || object.title.length)
                    message.title = $String(object.title);
            if (object.description != null)
                if (typeof object.description !== "string" || object.description.length)
                    message.description = $String(object.description);
            if (object.coverImage != null)
                if (typeof object.coverImage !== "string" || object.coverImage.length)
                    message.coverImage = $String(object.coverImage);
            return message;
        };

        /**
         * Creates a plain object from an Anime message. Also converts values to other types if specified.
         * @function toObject
         * @memberof anime.Anime
         * @static
         * @param {anime.Anime} message Anime
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Anime.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.id = 0;
                object.title = "";
                object.description = "";
                object.coverImage = "";
            }
            if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                object.id = message.id;
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                object.title = message.title;
            if (message.description != null && $Object.hasOwnProperty.call(message, "description"))
                object.description = message.description;
            if (message.coverImage != null && $Object.hasOwnProperty.call(message, "coverImage"))
                object.coverImage = message.coverImage;
            return object;
        };

        /**
         * Converts this Anime to JSON.
         * @function toJSON
         * @memberof anime.Anime
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Anime.prototype.toJSON = function() {
            return Anime.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Anime
         * @function getTypeUrl
         * @memberof anime.Anime
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Anime.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/anime.Anime";
        };

        return Anime;
    })();

    anime.AnimeListResponse = (function() {

        /**
         * Properties of an AnimeListResponse.
         * @typedef {Object} anime.AnimeListResponse.$Properties
         * @property {Array.<anime.Anime.$Properties>|null} [animes] AnimeListResponse animes
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an AnimeListResponse.
         * @memberof anime
         * @interface IAnimeListResponse
         * @augments anime.AnimeListResponse.$Properties
         * @deprecated Use anime.AnimeListResponse.$Properties instead.
         */

        /**
         * Shape of an AnimeListResponse.
         * @typedef {anime.AnimeListResponse.$Properties} anime.AnimeListResponse.$Shape
         */

        /**
         * Constructs a new AnimeListResponse.
         * @memberof anime
         * @classdesc Represents an AnimeListResponse.
         * @constructor
         * @param {anime.AnimeListResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const AnimeListResponse = function (properties) {
            this.animes = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * AnimeListResponse animes.
         * @member {Array.<anime.Anime.$Properties>} animes
         * @memberof anime.AnimeListResponse
         * @instance
         */
        AnimeListResponse.prototype.animes = $util.emptyArray;

        /**
         * Creates a new AnimeListResponse instance using the specified properties.
         * @function create
         * @memberof anime.AnimeListResponse
         * @static
         * @param {anime.AnimeListResponse.$Properties=} [properties] Properties to set
         * @returns {anime.AnimeListResponse} AnimeListResponse instance
         * @type {{
         *   (properties: anime.AnimeListResponse.$Shape): anime.AnimeListResponse & anime.AnimeListResponse.$Shape;
         *   (properties?: anime.AnimeListResponse.$Properties): anime.AnimeListResponse;
         * }}
         */
        AnimeListResponse.create = function(properties) {
            return new AnimeListResponse(properties);
        };

        /**
         * Encodes the specified AnimeListResponse message. Does not implicitly {@link anime.AnimeListResponse.verify|verify} messages.
         * @function encode
         * @memberof anime.AnimeListResponse
         * @static
         * @param {anime.AnimeListResponse.$Properties} message AnimeListResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AnimeListResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.animes != null && message.animes.length)
                for (let i = 0; i < message.animes.length; ++i)
                    $root.anime.Anime.encode(message.animes[i], writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified AnimeListResponse message, length delimited. Does not implicitly {@link anime.AnimeListResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof anime.AnimeListResponse
         * @static
         * @param {anime.AnimeListResponse.$Properties} message AnimeListResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AnimeListResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an AnimeListResponse message from the specified reader or buffer.
         * @function decode
         * @memberof anime.AnimeListResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {anime.AnimeListResponse & anime.AnimeListResponse.$Shape} AnimeListResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AnimeListResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.anime.AnimeListResponse();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if (!(message.animes && message.animes.length))
                            message.animes = [];
                        message.animes.push($root.anime.Anime.decode(reader, reader.uint32(), $undefined, _depth + 1));
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an AnimeListResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof anime.AnimeListResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {anime.AnimeListResponse & anime.AnimeListResponse.$Shape} AnimeListResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AnimeListResponse.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AnimeListResponse message.
         * @function verify
         * @memberof anime.AnimeListResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AnimeListResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.animes != null && $Object.hasOwnProperty.call(message, "animes")) {
                if (!$Array.isArray(message.animes))
                    return "animes: array expected";
                for (let i = 0; i < message.animes.length; ++i) {
                    let error = $root.anime.Anime.verify(message.animes[i], _depth + 1);
                    if (error)
                        return "animes." + error;
                }
            }
            return null;
        };

        /**
         * Creates an AnimeListResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof anime.AnimeListResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {anime.AnimeListResponse} AnimeListResponse
         */
        AnimeListResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.anime.AnimeListResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".anime.AnimeListResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.anime.AnimeListResponse();
            if (object.animes) {
                if (!$Array.isArray(object.animes))
                    throw $TypeError(".anime.AnimeListResponse.animes: array expected");
                message.animes = $Array(object.animes.length);
                for (let i = 0; i < object.animes.length; ++i) {
                    if (!$util.isObject(object.animes[i]))
                        throw $TypeError(".anime.AnimeListResponse.animes: object expected");
                    message.animes[i] = $root.anime.Anime.fromObject(object.animes[i], _depth + 1);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from an AnimeListResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof anime.AnimeListResponse
         * @static
         * @param {anime.AnimeListResponse} message AnimeListResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AnimeListResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.animes = [];
            if (message.animes && message.animes.length) {
                object.animes = $Array(message.animes.length);
                for (let j = 0; j < message.animes.length; ++j)
                    object.animes[j] = $root.anime.Anime.toObject(message.animes[j], options, _depth + 1);
            }
            return object;
        };

        /**
         * Converts this AnimeListResponse to JSON.
         * @function toJSON
         * @memberof anime.AnimeListResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AnimeListResponse.prototype.toJSON = function() {
            return AnimeListResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for AnimeListResponse
         * @function getTypeUrl
         * @memberof anime.AnimeListResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        AnimeListResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/anime.AnimeListResponse";
        };

        return AnimeListResponse;
    })();

    anime.StreamRequest = (function() {

        /**
         * Properties of a StreamRequest.
         * @typedef {Object} anime.StreamRequest.$Properties
         * @property {number|null} [animeId] StreamRequest animeId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a StreamRequest.
         * @memberof anime
         * @interface IStreamRequest
         * @augments anime.StreamRequest.$Properties
         * @deprecated Use anime.StreamRequest.$Properties instead.
         */

        /**
         * Shape of a StreamRequest.
         * @typedef {anime.StreamRequest.$Properties} anime.StreamRequest.$Shape
         */

        /**
         * Constructs a new StreamRequest.
         * @memberof anime
         * @classdesc Represents a StreamRequest.
         * @constructor
         * @param {anime.StreamRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const StreamRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * StreamRequest animeId.
         * @member {number} animeId
         * @memberof anime.StreamRequest
         * @instance
         */
        StreamRequest.prototype.animeId = 0;

        /**
         * Creates a new StreamRequest instance using the specified properties.
         * @function create
         * @memberof anime.StreamRequest
         * @static
         * @param {anime.StreamRequest.$Properties=} [properties] Properties to set
         * @returns {anime.StreamRequest} StreamRequest instance
         * @type {{
         *   (properties: anime.StreamRequest.$Shape): anime.StreamRequest & anime.StreamRequest.$Shape;
         *   (properties?: anime.StreamRequest.$Properties): anime.StreamRequest;
         * }}
         */
        StreamRequest.create = function(properties) {
            return new StreamRequest(properties);
        };

        /**
         * Encodes the specified StreamRequest message. Does not implicitly {@link anime.StreamRequest.verify|verify} messages.
         * @function encode
         * @memberof anime.StreamRequest
         * @static
         * @param {anime.StreamRequest.$Properties} message StreamRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StreamRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.animeId != null && $Object.hasOwnProperty.call(message, "animeId"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.animeId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified StreamRequest message, length delimited. Does not implicitly {@link anime.StreamRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof anime.StreamRequest
         * @static
         * @param {anime.StreamRequest.$Properties} message StreamRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StreamRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a StreamRequest message from the specified reader or buffer.
         * @function decode
         * @memberof anime.StreamRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {anime.StreamRequest & anime.StreamRequest.$Shape} StreamRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StreamRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.anime.StreamRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.int32())
                            message.animeId = value;
                        else
                            delete message.animeId;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a StreamRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof anime.StreamRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {anime.StreamRequest & anime.StreamRequest.$Shape} StreamRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StreamRequest.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StreamRequest message.
         * @function verify
         * @memberof anime.StreamRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StreamRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.animeId != null && $Object.hasOwnProperty.call(message, "animeId"))
                if (!$util.isInteger(message.animeId))
                    return "animeId: integer expected";
            return null;
        };

        /**
         * Creates a StreamRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof anime.StreamRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {anime.StreamRequest} StreamRequest
         */
        StreamRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.anime.StreamRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".anime.StreamRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.anime.StreamRequest();
            if (object.animeId != null)
                if ($Number(object.animeId) !== 0)
                    message.animeId = object.animeId | 0;
            return message;
        };

        /**
         * Creates a plain object from a StreamRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof anime.StreamRequest
         * @static
         * @param {anime.StreamRequest} message StreamRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StreamRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.animeId = 0;
            if (message.animeId != null && $Object.hasOwnProperty.call(message, "animeId"))
                object.animeId = message.animeId;
            return object;
        };

        /**
         * Converts this StreamRequest to JSON.
         * @function toJSON
         * @memberof anime.StreamRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StreamRequest.prototype.toJSON = function() {
            return StreamRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for StreamRequest
         * @function getTypeUrl
         * @memberof anime.StreamRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        StreamRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/anime.StreamRequest";
        };

        return StreamRequest;
    })();

    anime.StreamResponse = (function() {

        /**
         * Properties of a StreamResponse.
         * @typedef {Object} anime.StreamResponse.$Properties
         * @property {string|null} [streamUrl] StreamResponse streamUrl
         * @property {string|null} [title] StreamResponse title
         * @property {string|null} [coverImage] StreamResponse coverImage
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a StreamResponse.
         * @memberof anime
         * @interface IStreamResponse
         * @augments anime.StreamResponse.$Properties
         * @deprecated Use anime.StreamResponse.$Properties instead.
         */

        /**
         * Shape of a StreamResponse.
         * @typedef {anime.StreamResponse.$Properties} anime.StreamResponse.$Shape
         */

        /**
         * Constructs a new StreamResponse.
         * @memberof anime
         * @classdesc Represents a StreamResponse.
         * @constructor
         * @param {anime.StreamResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const StreamResponse = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * StreamResponse streamUrl.
         * @member {string} streamUrl
         * @memberof anime.StreamResponse
         * @instance
         */
        StreamResponse.prototype.streamUrl = "";

        /**
         * StreamResponse title.
         * @member {string} title
         * @memberof anime.StreamResponse
         * @instance
         */
        StreamResponse.prototype.title = "";

        /**
         * StreamResponse coverImage.
         * @member {string} coverImage
         * @memberof anime.StreamResponse
         * @instance
         */
        StreamResponse.prototype.coverImage = "";

        /**
         * Creates a new StreamResponse instance using the specified properties.
         * @function create
         * @memberof anime.StreamResponse
         * @static
         * @param {anime.StreamResponse.$Properties=} [properties] Properties to set
         * @returns {anime.StreamResponse} StreamResponse instance
         * @type {{
         *   (properties: anime.StreamResponse.$Shape): anime.StreamResponse & anime.StreamResponse.$Shape;
         *   (properties?: anime.StreamResponse.$Properties): anime.StreamResponse;
         * }}
         */
        StreamResponse.create = function(properties) {
            return new StreamResponse(properties);
        };

        /**
         * Encodes the specified StreamResponse message. Does not implicitly {@link anime.StreamResponse.verify|verify} messages.
         * @function encode
         * @memberof anime.StreamResponse
         * @static
         * @param {anime.StreamResponse.$Properties} message StreamResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StreamResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.streamUrl != null && $Object.hasOwnProperty.call(message, "streamUrl"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.streamUrl);
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.title);
            if (message.coverImage != null && $Object.hasOwnProperty.call(message, "coverImage"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.coverImage);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified StreamResponse message, length delimited. Does not implicitly {@link anime.StreamResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof anime.StreamResponse
         * @static
         * @param {anime.StreamResponse.$Properties} message StreamResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StreamResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a StreamResponse message from the specified reader or buffer.
         * @function decode
         * @memberof anime.StreamResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {anime.StreamResponse & anime.StreamResponse.$Shape} StreamResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StreamResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.anime.StreamResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.streamUrl = value;
                        else
                            delete message.streamUrl;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.title = value;
                        else
                            delete message.title;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.coverImage = value;
                        else
                            delete message.coverImage;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a StreamResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof anime.StreamResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {anime.StreamResponse & anime.StreamResponse.$Shape} StreamResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StreamResponse.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StreamResponse message.
         * @function verify
         * @memberof anime.StreamResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StreamResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.streamUrl != null && $Object.hasOwnProperty.call(message, "streamUrl"))
                if (!$util.isString(message.streamUrl))
                    return "streamUrl: string expected";
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.coverImage != null && $Object.hasOwnProperty.call(message, "coverImage"))
                if (!$util.isString(message.coverImage))
                    return "coverImage: string expected";
            return null;
        };

        /**
         * Creates a StreamResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof anime.StreamResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {anime.StreamResponse} StreamResponse
         */
        StreamResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.anime.StreamResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".anime.StreamResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.anime.StreamResponse();
            if (object.streamUrl != null)
                if (typeof object.streamUrl !== "string" || object.streamUrl.length)
                    message.streamUrl = $String(object.streamUrl);
            if (object.title != null)
                if (typeof object.title !== "string" || object.title.length)
                    message.title = $String(object.title);
            if (object.coverImage != null)
                if (typeof object.coverImage !== "string" || object.coverImage.length)
                    message.coverImage = $String(object.coverImage);
            return message;
        };

        /**
         * Creates a plain object from a StreamResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof anime.StreamResponse
         * @static
         * @param {anime.StreamResponse} message StreamResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StreamResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.streamUrl = "";
                object.title = "";
                object.coverImage = "";
            }
            if (message.streamUrl != null && $Object.hasOwnProperty.call(message, "streamUrl"))
                object.streamUrl = message.streamUrl;
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                object.title = message.title;
            if (message.coverImage != null && $Object.hasOwnProperty.call(message, "coverImage"))
                object.coverImage = message.coverImage;
            return object;
        };

        /**
         * Converts this StreamResponse to JSON.
         * @function toJSON
         * @memberof anime.StreamResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StreamResponse.prototype.toJSON = function() {
            return StreamResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for StreamResponse
         * @function getTypeUrl
         * @memberof anime.StreamResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        StreamResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/anime.StreamResponse";
        };

        return StreamResponse;
    })();

    return anime;
})();

export {
  $root as default
};
