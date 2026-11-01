/*
  This file is a part of MaxPV_ESP.ino - ESP8266 program that provides a web interface and a API for EcoPV 3+
  https://github.com/Jetblack31/

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as published
  by the Free Software Foundation, either version 2.1 of the License, or
  (at your option) any later version.
*/

// ***********************************************************************************
// Lecture de l'en-tête Authorization d'une requête ESPAsyncWebServer
//
// La bibliothèque ne range pas l'en-tête Authorization avec les autres en-têtes :
// il est conservé dans les membres privés _authorization (sans le préfixe "Digest ")
// et _isDigest de AsyncWebServerRequest. MaxPV! en a besoin pour contrôler lui-même
// le nonce, le compteur nc et l'URI signée (protection contre le rejeu).
//
// Pour ne pas modifier la bibliothèque, on utilise une propriété du C++ : une
// instanciation explicite de modèle peut nommer un membre privé ([temp.explicit]).
// Elle fournit ici un pointeur vers chacun des deux membres, en lecture seule.
//
// A retirer lors du passage à une bibliothèque qui expose cet en-tête.
// ***********************************************************************************

#pragma once

#include <ESPAsyncWebServer.h>

template <typename Tag, typename Tag::type Member>
struct PrivateMemberAccess
{
  friend typename Tag::type privateMember(Tag) { return Member; }
};

struct RequestAuthorizationTag { typedef String AsyncWebServerRequest::*type; friend type privateMember(RequestAuthorizationTag); };
struct RequestIsDigestTag      { typedef bool   AsyncWebServerRequest::*type; friend type privateMember(RequestIsDigestTag); };

template struct PrivateMemberAccess<RequestAuthorizationTag, &AsyncWebServerRequest::_authorization>;
template struct PrivateMemberAccess<RequestIsDigestTag,      &AsyncWebServerRequest::_isDigest>;

// Contenu de l'en-tête Authorization, sans le préfixe "Digest " ou "Basic "
inline const String& requestAuthorization (const AsyncWebServerRequest* request)
{
  return request->*privateMember(RequestAuthorizationTag());
}

// Vrai si l'en-tête Authorization utilise l'authentification Digest
inline bool requestIsDigest (const AsyncWebServerRequest* request)
{
  return request->*privateMember(RequestIsDigestTag());
}
