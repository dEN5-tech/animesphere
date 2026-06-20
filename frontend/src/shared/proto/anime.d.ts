import * as $protobuf from "protobufjs";
import Long = require("long");

/** Namespace anime. */
export namespace anime {

    /** Represents an AnimeService */
    class AnimeService extends $protobuf.rpc.Service {

        /**
         * Constructs a new AnimeService service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

        /**
         * Creates new AnimeService service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): AnimeService;

        /** Calls GetAnimeList. */
        getAnimeList: anime.AnimeService.GetAnimeList;

        /** Calls GetAnimeStreams. */
        getAnimeStreams: anime.AnimeService.GetAnimeStreams;
    }

    namespace AnimeService {

        /**
         * Callback as used by {@link anime.AnimeService#getAnimeList}.
         * @param error Error, if any
         * @param [response] AnimeListResponse
         */
        type GetAnimeListCallback = (error: (Error|null), response?: anime.AnimeListResponse) => void;

        /** Calls GetAnimeList. */
        type GetAnimeList = {
          (request: anime.IEmpty, callback: anime.AnimeService.GetAnimeListCallback): void;
          (request: anime.IEmpty): Promise<anime.AnimeListResponse>;
          readonly name: "GetAnimeList";
          readonly path: "/anime.AnimeService/GetAnimeList";
          readonly requestType: "Empty";
          readonly responseType: "AnimeListResponse";
          readonly requestStream: undefined;
          readonly responseStream: undefined;
        };

        /**
         * Callback as used by {@link anime.AnimeService#getAnimeStreams}.
         * @param error Error, if any
         * @param [response] StreamResponse
         */
        type GetAnimeStreamsCallback = (error: (Error|null), response?: anime.StreamResponse) => void;

        /** Calls GetAnimeStreams. */
        type GetAnimeStreams = {
          (request: anime.IStreamRequest, callback: anime.AnimeService.GetAnimeStreamsCallback): void;
          (request: anime.IStreamRequest): Promise<anime.StreamResponse>;
          readonly name: "GetAnimeStreams";
          readonly path: "/anime.AnimeService/GetAnimeStreams";
          readonly requestType: "StreamRequest";
          readonly responseType: "StreamResponse";
          readonly requestStream: undefined;
          readonly responseStream: undefined;
        };
    }

    /**
     * Properties of an Empty.
     * @deprecated Use anime.Empty.$Properties instead.
     */
    interface IEmpty extends anime.Empty.$Properties {
    }

    /** Represents an Empty. */
    class Empty {

        /**
         * Constructs a new Empty.
         * @param [properties] Properties to set
         */
        constructor(properties?: anime.Empty.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new Empty instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Empty instance
         */
        static create(properties: anime.Empty.$Shape): anime.Empty & anime.Empty.$Shape;
        static create(properties?: anime.Empty.$Properties): anime.Empty;

        /**
         * Encodes the specified Empty message. Does not implicitly {@link anime.Empty.verify|verify} messages.
         * @param message Empty message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: anime.Empty.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Empty message, length delimited. Does not implicitly {@link anime.Empty.verify|verify} messages.
         * @param message Empty message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: anime.Empty.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Empty message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {anime.Empty & anime.Empty.$Shape} Empty
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): anime.Empty & anime.Empty.$Shape;

        /**
         * Decodes an Empty message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {anime.Empty & anime.Empty.$Shape} Empty
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): anime.Empty & anime.Empty.$Shape;

        /**
         * Verifies an Empty message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Empty message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Empty
         */
        static fromObject(object: { [k: string]: any }): anime.Empty;

        /**
         * Creates a plain object from an Empty message. Also converts values to other types if specified.
         * @param message Empty
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: anime.Empty, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Empty to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Empty
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Empty {

        /** Properties of an Empty. */
        interface $Properties {

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an Empty. */
        type $Shape = anime.Empty.$Properties;
    }

    /**
     * Properties of an Anime.
     * @deprecated Use anime.Anime.$Properties instead.
     */
    interface IAnime extends anime.Anime.$Properties {
    }

    /** Represents an Anime. */
    class Anime {

        /**
         * Constructs a new Anime.
         * @param [properties] Properties to set
         */
        constructor(properties?: anime.Anime.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** Anime id. */
        id: number;

        /** Anime title. */
        title: string;

        /** Anime description. */
        description: string;

        /** Anime coverImage. */
        coverImage: string;

        /**
         * Creates a new Anime instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Anime instance
         */
        static create(properties: anime.Anime.$Shape): anime.Anime & anime.Anime.$Shape;
        static create(properties?: anime.Anime.$Properties): anime.Anime;

        /**
         * Encodes the specified Anime message. Does not implicitly {@link anime.Anime.verify|verify} messages.
         * @param message Anime message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: anime.Anime.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Anime message, length delimited. Does not implicitly {@link anime.Anime.verify|verify} messages.
         * @param message Anime message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: anime.Anime.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Anime message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {anime.Anime & anime.Anime.$Shape} Anime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): anime.Anime & anime.Anime.$Shape;

        /**
         * Decodes an Anime message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {anime.Anime & anime.Anime.$Shape} Anime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): anime.Anime & anime.Anime.$Shape;

        /**
         * Verifies an Anime message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Anime message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Anime
         */
        static fromObject(object: { [k: string]: any }): anime.Anime;

        /**
         * Creates a plain object from an Anime message. Also converts values to other types if specified.
         * @param message Anime
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: anime.Anime, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Anime to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Anime
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Anime {

        /** Properties of an Anime. */
        interface $Properties {

            /** Anime id */
            id?: (number|null);

            /** Anime title */
            title?: (string|null);

            /** Anime description */
            description?: (string|null);

            /** Anime coverImage */
            coverImage?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an Anime. */
        type $Shape = anime.Anime.$Properties;
    }

    /**
     * Properties of an AnimeListResponse.
     * @deprecated Use anime.AnimeListResponse.$Properties instead.
     */
    interface IAnimeListResponse extends anime.AnimeListResponse.$Properties {
    }

    /** Represents an AnimeListResponse. */
    class AnimeListResponse {

        /**
         * Constructs a new AnimeListResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: anime.AnimeListResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** AnimeListResponse animes. */
        animes: anime.Anime.$Properties[];

        /**
         * Creates a new AnimeListResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AnimeListResponse instance
         */
        static create(properties: anime.AnimeListResponse.$Shape): anime.AnimeListResponse & anime.AnimeListResponse.$Shape;
        static create(properties?: anime.AnimeListResponse.$Properties): anime.AnimeListResponse;

        /**
         * Encodes the specified AnimeListResponse message. Does not implicitly {@link anime.AnimeListResponse.verify|verify} messages.
         * @param message AnimeListResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: anime.AnimeListResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AnimeListResponse message, length delimited. Does not implicitly {@link anime.AnimeListResponse.verify|verify} messages.
         * @param message AnimeListResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: anime.AnimeListResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AnimeListResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {anime.AnimeListResponse & anime.AnimeListResponse.$Shape} AnimeListResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): anime.AnimeListResponse & anime.AnimeListResponse.$Shape;

        /**
         * Decodes an AnimeListResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {anime.AnimeListResponse & anime.AnimeListResponse.$Shape} AnimeListResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): anime.AnimeListResponse & anime.AnimeListResponse.$Shape;

        /**
         * Verifies an AnimeListResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AnimeListResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AnimeListResponse
         */
        static fromObject(object: { [k: string]: any }): anime.AnimeListResponse;

        /**
         * Creates a plain object from an AnimeListResponse message. Also converts values to other types if specified.
         * @param message AnimeListResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: anime.AnimeListResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AnimeListResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for AnimeListResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace AnimeListResponse {

        /** Properties of an AnimeListResponse. */
        interface $Properties {

            /** AnimeListResponse animes */
            animes?: (anime.Anime.$Properties[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an AnimeListResponse. */
        type $Shape = anime.AnimeListResponse.$Properties;
    }

    /**
     * Properties of a StreamRequest.
     * @deprecated Use anime.StreamRequest.$Properties instead.
     */
    interface IStreamRequest extends anime.StreamRequest.$Properties {
    }

    /** Represents a StreamRequest. */
    class StreamRequest {

        /**
         * Constructs a new StreamRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: anime.StreamRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** StreamRequest animeId. */
        animeId: number;

        /**
         * Creates a new StreamRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StreamRequest instance
         */
        static create(properties: anime.StreamRequest.$Shape): anime.StreamRequest & anime.StreamRequest.$Shape;
        static create(properties?: anime.StreamRequest.$Properties): anime.StreamRequest;

        /**
         * Encodes the specified StreamRequest message. Does not implicitly {@link anime.StreamRequest.verify|verify} messages.
         * @param message StreamRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: anime.StreamRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StreamRequest message, length delimited. Does not implicitly {@link anime.StreamRequest.verify|verify} messages.
         * @param message StreamRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: anime.StreamRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StreamRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {anime.StreamRequest & anime.StreamRequest.$Shape} StreamRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): anime.StreamRequest & anime.StreamRequest.$Shape;

        /**
         * Decodes a StreamRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {anime.StreamRequest & anime.StreamRequest.$Shape} StreamRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): anime.StreamRequest & anime.StreamRequest.$Shape;

        /**
         * Verifies a StreamRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StreamRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StreamRequest
         */
        static fromObject(object: { [k: string]: any }): anime.StreamRequest;

        /**
         * Creates a plain object from a StreamRequest message. Also converts values to other types if specified.
         * @param message StreamRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: anime.StreamRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StreamRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for StreamRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace StreamRequest {

        /** Properties of a StreamRequest. */
        interface $Properties {

            /** StreamRequest animeId */
            animeId?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a StreamRequest. */
        type $Shape = anime.StreamRequest.$Properties;
    }

    /**
     * Properties of a StreamResponse.
     * @deprecated Use anime.StreamResponse.$Properties instead.
     */
    interface IStreamResponse extends anime.StreamResponse.$Properties {
    }

    /** Represents a StreamResponse. */
    class StreamResponse {

        /**
         * Constructs a new StreamResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: anime.StreamResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** StreamResponse streamUrl. */
        streamUrl: string;

        /** StreamResponse title. */
        title: string;

        /** StreamResponse coverImage. */
        coverImage: string;

        /**
         * Creates a new StreamResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StreamResponse instance
         */
        static create(properties: anime.StreamResponse.$Shape): anime.StreamResponse & anime.StreamResponse.$Shape;
        static create(properties?: anime.StreamResponse.$Properties): anime.StreamResponse;

        /**
         * Encodes the specified StreamResponse message. Does not implicitly {@link anime.StreamResponse.verify|verify} messages.
         * @param message StreamResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: anime.StreamResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StreamResponse message, length delimited. Does not implicitly {@link anime.StreamResponse.verify|verify} messages.
         * @param message StreamResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: anime.StreamResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StreamResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {anime.StreamResponse & anime.StreamResponse.$Shape} StreamResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): anime.StreamResponse & anime.StreamResponse.$Shape;

        /**
         * Decodes a StreamResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {anime.StreamResponse & anime.StreamResponse.$Shape} StreamResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): anime.StreamResponse & anime.StreamResponse.$Shape;

        /**
         * Verifies a StreamResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StreamResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StreamResponse
         */
        static fromObject(object: { [k: string]: any }): anime.StreamResponse;

        /**
         * Creates a plain object from a StreamResponse message. Also converts values to other types if specified.
         * @param message StreamResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: anime.StreamResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StreamResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for StreamResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace StreamResponse {

        /** Properties of a StreamResponse. */
        interface $Properties {

            /** StreamResponse streamUrl */
            streamUrl?: (string|null);

            /** StreamResponse title */
            title?: (string|null);

            /** StreamResponse coverImage */
            coverImage?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a StreamResponse. */
        type $Shape = anime.StreamResponse.$Properties;
    }
}
