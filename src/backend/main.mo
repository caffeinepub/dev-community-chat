import Time "mo:core/Time";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Blob "mo:core/Blob";
import Nat8 "mo:core/Nat8";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  module UserProfile {
    public func compare(profile1 : UserProfile, profile2 : UserProfile) : Order.Order {
      Text.compare(profile1.username, profile2.username);
    };

    public func compareByLastSeen(profile1 : UserProfile, profile2 : UserProfile) : Order.Order {
      Int.compare(profile2.lastSeen, profile1.lastSeen);
    };
  };

  module GroupView {
    public func compare(groupView1 : GroupView, groupView2 : GroupView) : Order.Order {
      Text.compare(groupView1.name, groupView2.name);
    };

    public func compareByMemberCount(groupView1 : GroupView, groupView2 : GroupView) : Order.Order {
      Int.compare(groupView2.memberCount, groupView1.memberCount);
    };
  };

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

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, UserProfile>();
  let groups = Map.empty<Text, Group>();
  let messages = Map.empty<Text, [Message]>();
  let sessions = Map.empty<Text, Session>();
  var messageIdCounter : Nat = 0;
  var initialized : Bool = false;

  // Initialize default groups on first deployment
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

  // Helper function to hash passwords (simple implementation)
  func hashPassword(password : Text) : Text {
    let blob = password.encodeUtf8();
    let hash = blob.toArray();
    var result = "";
    for (byte in hash.vals()) {
      result #= byte.toText();
    };
    result;
  };

  // Helper function to generate session token
  func generateSessionToken(userId : Principal) : Text {
    let timestamp = Time.now().toText();
    let principal = userId.toText();
    principal # "-" # timestamp;
  };

  // Helper function to validate session and return userId
  func validateSession(token : Text) : ?Principal {
    switch (sessions.get(token)) {
      case (null) { null };
      case (?session) {
        let now = Time.now();
        // Check if session expired (24 hours = 86400000000000 nanoseconds)
        if (now > session.expiresAt) {
          sessions.remove(token);
          null;
        } else {
          // Update last active time
          let updatedSession = {
            token = session.token;
            userId = session.userId;
            expiresAt = now + 86400000000000; // Extend by 24 hours
            lastActive = now;
          };
          sessions.add(token, updatedSession);
          ?session.userId;
        };
      };
    };
  };

  // User Registration - accessible to anyone
  public shared func register(username : Text, email : Text, password : Text) : async () {
    if (username.isEmpty() or email.isEmpty() or password.isEmpty()) {
      Runtime.trap("Username, email, and password cannot be empty");
    };

    // Check if username already exists
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

    // Create a synthetic principal for username-based registration
    // In production, this would be handled differently
    let userPrincipal = Principal.fromText("aaaaa-aa"); // Placeholder
    userProfiles.add(userPrincipal, newProfile);
  };

  // User Login - accessible to anyone, returns session token
  public shared func login(username : Text, password : Text) : async Text {
    let passwordHash = hashPassword(password);

    for ((principal, profile) in userProfiles.entries()) {
      if (profile.username == username and profile.passwordHash == passwordHash) {
        let token = generateSessionToken(principal);
        let session : Session = {
          token;
          userId = principal;
          expiresAt = Time.now() + 86400000000000; // 24 hours
          lastActive = Time.now();
        };
        sessions.add(token, session);

        // Update user status
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

  // User Logout - requires valid session
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

  // Validate session token - requires valid session
  public query func validateSessionToken(token : Text) : async Bool {
    switch (sessions.get(token)) {
      case (null) { false };
      case (?session) {
        Time.now() <= session.expiresAt;
      };
    };
  };

  // Get all users with online status - requires user authentication
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

  // Get caller's user profile - requires user authentication
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

  // Get another user's profile - requires user authentication
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

  // Save caller's user profile - requires user authentication
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

  // Create group - admin only
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

  // Get group details - requires user authentication
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

  // Get all groups with member count - requires user authentication
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

  // Join a group - requires user authentication
  public shared ({ caller }) func joinGroup(groupId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join groups");
    };

    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        // Check if already a member
        for (member in group.members.values()) {
          if (member == caller) {
            Runtime.trap("Already a member of this group");
          };
        };

        group.members := group.members.concat([caller]);
        groups.add(groupId, group);
      };
    };
  };

  // Send message to group - requires user authentication
  public shared ({ caller }) func sendMessage(groupId : Text, text : Text, sessionToken : Text) : async Nat {
    // Validate session token
    switch (validateSession(sessionToken)) {
      case (null) { Runtime.trap("Invalid or expired session") };
      case (?userId) {
        if (userId != caller) {
          Runtime.trap("Session token does not match caller");
        };
      };
    };

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    if (text.isEmpty()) {
      Runtime.trap("Message text cannot be empty");
    };

    // Verify group exists
    switch (groups.get(groupId)) {
      case (null) { Runtime.trap("Group not found") };
      case (?group) {
        // Get sender username
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

  // Get messages for a group - requires user authentication
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
};
