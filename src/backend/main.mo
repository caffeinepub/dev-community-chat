import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";

import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";


actor {
  type UserProfile = {
    username : Text;
    email : Text;
    passwordHash : Text;
    lastSeen : Time.Time;
    online : Bool;
  };

  type Message = {
    id : Nat;
    senderId : Principal;
    senderUsername : Text;
    groupId : Text;
    text : Text;
    timestamp : Time.Time;
  };

  type Session = {
    token : Text;
    userId : Principal;
    expiresAt : Time.Time;
    lastActive : Time.Time;
  };

  type Group = {
    id : Text;
    name : Text;
    description : Text;
    var members : [Principal];
  };

  type GroupView = {
    id : Text;
    name : Text;
    description : Text;
    memberCount : Nat;
  };

  type PublicUserProfile = {
    username : Text;
    email : Text;
    lastSeen : Time.Time;
    online : Bool;
  };

  type Article = {
    id : Nat;
    title : Text;
    content : Text;
    imageUrl : ?Text;
    authorName : Text;
    authorId : Text;
    createdAt : Time.Time;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let userProfiles = Map.empty<Principal, UserProfile>();
  let groups = Map.empty<Text, Group>();
  let messages = Map.empty<Text, [Message]>();
  let sessions = Map.empty<Text, Session>();
  let articles = Map.empty<Nat, Article>();
  var messageIdCounter : Nat = 0;
  var articleIdCounter : Nat = 0;
  var initialized : Bool = false;

  func arrayContains(array : [Principal], target : Principal) : Bool {
    array.values().any(func(item) { target == item });
  };

  system func postupgrade() {
    if (not initialized) {
      initializeDefaultGroups();
      initialized := true;
    };
  };

  func initializeDefaultGroups() {
    let defaultGroups = [
      ("general", "General", "General discussion for all topics"),
      ("javascript", "JavaScript", "JavaScript programming discussions"),
      ("rust", "Rust", "Rust programming discussions"),
      ("web3", "Web3", "Web3 and blockchain discussions"),
      ("help", "Help & Support", "Get help and support from the community"),
    ];

    for ((id, name, description) in defaultGroups.vals()) {
      let newGroup : Group = {
        id;
        name;
        description;
        var members = [];
      };
      groups.add(id, newGroup);
    };
  };

  func hashPassword(password : Text) : Text {
    password;
  };

  func generateSessionToken(userId : Principal) : Text {
    let timestamp = Time.now().toText();
    let principal = userId.toText();
    principal # "-" # timestamp;
  };

  func validateSession(token : Text) : ?Principal {
    switch (sessions.get(token)) {
      case (null) { null };
      case (?session) {
        let now = Time.now();
        if (now > session.expiresAt) {
          sessions.remove(token);
          null;
        } else {
          let updatedSession = {
            token = session.token;
            userId = session.userId;
            expiresAt = now + 86400000000000;
            lastActive = now;
          };
          sessions.add(token, updatedSession);
          ?session.userId;
        };
      };
    };
  };

  public shared func register(username : Text, email : Text, password : Text) : async () {
    if (username.isEmpty() or email.isEmpty() or password.isEmpty()) {
      Runtime.trap("Username, email, and password cannot be empty");
    };

    for ((principal, profile) in userProfiles.entries()) {
      if (profile.username == username) {
        Runtime.trap("Username already exists");
      };
    };

    let passwordHash = hashPassword(password);
    let newProfile : UserProfile = {
      username;
      email;
      passwordHash;
      lastSeen = Time.now();
      online = false;
    };

    let userPrincipal = Principal.fromText("aaaaa-aa");
    userProfiles.add(userPrincipal, newProfile);
  };

  public shared func login(username : Text, password : Text) : async Text {
    let passwordHash = hashPassword(password);

    for ((principal, profile) in userProfiles.entries()) {
      if (profile.username == username and profile.passwordHash == passwordHash) {
        let token = generateSessionToken(principal);
        let session : Session = {
          token;
          userId = principal;
          expiresAt = Time.now() + 86400000000000;
          lastActive = Time.now();
        };
        sessions.add(token, session);

        let updatedProfile = {
          username = profile.username;
          email = profile.email;
          passwordHash = profile.passwordHash;
          lastSeen = Time.now();
          online = true;
        };
        userProfiles.add(principal, updatedProfile);

        return token;
      };
    };

    Runtime.trap("Invalid username or password");
  };

  public shared func logout(token : Text) : async () {
    switch (validateSession(token)) {
      case (null) { Runtime.trap("Invalid or expired session") };
      case (?userId) {
        sessions.remove(token);
        switch (userProfiles.get(userId)) {
          case (null) {};
          case (?profile) {
            let updatedProfile = {
              username = profile.username;
              email = profile.email;
              passwordHash = profile.passwordHash;
              lastSeen = Time.now();
              online = false;
            };
            userProfiles.add(userId, updatedProfile);
          };
        };
      };
    };
  };

  public query func validateSessionToken(token : Text) : async Bool {
    switch (sessions.get(token)) {
      case (null) { false };
      case (?session) {
        Time.now() <= session.expiresAt;
      };
    };
  };

  public query ({ caller }) func getAllUsers() : async [PublicUserProfile] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view user list");
    };

    let users = userProfiles.entries().toArray().map(
      func((principal, profile)) {
        {
          username = profile.username;
          email = profile.email;
          lastSeen = profile.lastSeen;
          online = profile.online;
        };
      }
    );
    users;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?PublicUserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };

    switch (userProfiles.get(caller)) {
      case (null) { null };
      case (?profile) {
        ?{
          username = profile.username;
          email = profile.email;
          lastSeen = profile.lastSeen;
          online = profile.online;
        };
      };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?PublicUserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
        Runtime.trap("Unauthorized: Only users can view profiles");
      };
    };

    switch (userProfiles.get(user)) {
      case (null) { null };
      case (?profile) {
        ?{
          username = profile.username;
          email = profile.email;
          lastSeen = profile.lastSeen;
          online = profile.online;
        };
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(username : Text, email : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    switch (userProfiles.get(caller)) {
      case (null) {
        Runtime.trap("User profile not found");
      };
      case (?profile) {
        let updatedProfile = {
          username;
          email;
          passwordHash = profile.passwordHash;
          lastSeen = Time.now();
          online = profile.online;
        };
        userProfiles.add(caller, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func createGroup(id : Text, name : Text, description : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin privileges required to create a group");
    };

    if (groups.containsKey(id)) {
      Runtime.trap("Group already exists");
    };

    if (id.isEmpty() or name.isEmpty() or description.isEmpty()) {
      Runtime.trap("Group id, name, and description cannot be empty");
    };

    let newGroup : Group = {
      id;
      name;
      description;
      var members = [];
    };
    groups.add(id, newGroup);
  };

  public shared ({ caller }) func getGroup(id : Text) : async GroupView {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view groups");
    };

    switch (groups.get(id)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) { toGroupView(group) };
    };
  };

  func toGroupView(group : Group) : GroupView {
    {
      id = group.id;
      name = group.name;
      description = group.description;
      memberCount = group.members.size();
    };
  };

  public query ({ caller }) func getAllGroups() : async [GroupView] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view groups");
    };

    var groupViews : [GroupView] = [];
    for ((id, group) in groups.entries()) {
      groupViews := groupViews.concat([toGroupView(group)]);
    };
    groupViews;
  };

  public shared ({ caller }) func joinGroup(groupId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join groups");
    };

    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        if (arrayContains(group.members, caller)) {
          Runtime.trap("Already a member of this group");
        };

        group.members := group.members.concat([caller]);
        groups.add(groupId, group);
      };
    };
  };

  public shared ({ caller }) func sendMessage(groupId : Text, text : Text, sessionToken : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    switch (validateSession(sessionToken)) {
      case (null) { Runtime.trap("Invalid or expired session") };
      case (?userId) {
        if (userId != caller) {
          Runtime.trap("Session token does not match caller");
        };
      };
    };

    if (text.isEmpty()) {
      Runtime.trap("Message text cannot be empty");
    };

    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        let senderUsername = switch (userProfiles.get(caller)) {
          case (null) { "Unknown" };
          case (?profile) { profile.username };
        };

        messageIdCounter += 1;
        let message : Message = {
          id = messageIdCounter;
          senderId = caller;
          senderUsername;
          groupId;
          text;
          timestamp = Time.now();
        };

        let groupMessages = switch (messages.get(groupId)) {
          case (null) { [] };
          case (?msgs) { msgs };
        };

        let updatedMessages = groupMessages.concat([message]);
        messages.add(groupId, updatedMessages);
        messageIdCounter;
      };
    };
  };

  public query ({ caller }) func getMessages(groupId : Text, since : ?Time.Time) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };

    switch (messages.get(groupId)) {
      case (null) { [] };
      case (?msgs) {
        let messageArray = msgs;
        switch (since) {
          case (null) { messageArray };
          case (?timestamp) {
            messageArray.filter<Message>(func(msg) { msg.timestamp > timestamp });
          };
        };
      };
    };
  };

  // ── Article functions ──

  // Create a new article; sessionToken used to identify the author
  public shared func createArticle(sessionToken : Text, title : Text, content : Text, imageUrl : ?Text) : async Nat {
    let userId = switch (validateSession(sessionToken)) {
      case (null) { Runtime.trap("Invalid or expired session") };
      case (?id) { id };
    };

    if (title.isEmpty() or content.isEmpty()) {
      Runtime.trap("Title and content cannot be empty");
    };

    let authorName = switch (userProfiles.get(userId)) {
      case (null) { "Unknown" };
      case (?profile) { profile.username };
    };

    articleIdCounter += 1;
    let article : Article = {
      id = articleIdCounter;
      title;
      content;
      imageUrl;
      authorName;
      authorId = userId.toText();
      createdAt = Time.now();
    };
    articles.add(articleIdCounter, article);
    articleIdCounter;
  };

  // Get all articles sorted newest-first (public)
  public query func getAllArticles() : async [Article] {
    let all = articles.entries().toArray().map(func((id, a)) { a });
    all.sort(func(a, b) {
      if (a.createdAt > b.createdAt) { #less }
      else if (a.createdAt < b.createdAt) { #greater }
      else { #equal };
    });
  };

  // Get a single article by id (public)
  public query func getArticle(id : Nat) : async ?Article {
    articles.get(id);
  };

  // Update an article; only the original author (by sessionToken) can update
  public shared func updateArticle(sessionToken : Text, id : Nat, title : Text, content : Text, imageUrl : ?Text) : async () {
    let userId = switch (validateSession(sessionToken)) {
      case (null) { Runtime.trap("Invalid or expired session") };
      case (?uid) { uid };
    };

    if (title.isEmpty() or content.isEmpty()) {
      Runtime.trap("Title and content cannot be empty");
    };

    switch (articles.get(id)) {
      case (null) { Runtime.trap("Article not found") };
      case (?article) {
        if (article.authorId != userId.toText()) {
          Runtime.trap("Unauthorized: Only the author can edit this article");
        };
        let updated : Article = {
          id = article.id;
          title;
          content;
          imageUrl;
          authorName = article.authorName;
          authorId = article.authorId;
          createdAt = article.createdAt;
        };
        articles.add(id, updated);
      };
    };
  };

  // Delete an article; only the original author can delete
  public shared func deleteArticle(sessionToken : Text, id : Nat) : async () {
    let userId = switch (validateSession(sessionToken)) {
      case (null) { Runtime.trap("Invalid or expired session") };
      case (?uid) { uid };
    };

    switch (articles.get(id)) {
      case (null) { Runtime.trap("Article not found") };
      case (?article) {
        if (article.authorId != userId.toText()) {
          Runtime.trap("Unauthorized: Only the author can delete this article");
        };
        articles.remove(id);
      };
    };
  };
};
