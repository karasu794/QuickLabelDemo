declare global {
  interface Window {
    google: typeof google;
    initMap?: () => void;
  }
}

// 新しいAutocompleteSuggestion APIの型定義
declare namespace google.maps.places {
  interface AutocompleteSuggestion {
    placePrediction: {
      text: {
        text: string;
      };
      placeId: string;
      structuredFormat: {
        mainText: {
          text: string;
        };
        secondaryText?: {
          text: string;
        };
      };
    };
  }

  interface AutocompleteSuggestionRequest {
    input: string;
    includedPrimaryTypes?: string[];
    language?: string;
    region?: string;
  }

  interface AutocompleteSuggestionResponse {
    suggestions: AutocompleteSuggestion[];
  }

  namespace AutocompleteSuggestion {
    function fetchAutocompleteSuggestions(
      request: AutocompleteSuggestionRequest
    ): Promise<AutocompleteSuggestionResponse>;
  }
}

export {}; 