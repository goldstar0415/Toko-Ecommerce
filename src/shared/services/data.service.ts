import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { IThread, IComment } from '../interfaces';
import { LocalStorageService } from 'ngx-webstorage';

declare var firebase: any;

@Injectable()
export class DataService {
    databaseRef: any = firebase.database();
    usersRef: any = firebase.database().ref('users');
    threadsRef: any = firebase.database().ref('threads');
    commentsRef: any = firebase.database().ref('comments');
    statisticsRef: any = firebase.database().ref('statistics');
    storageRef: any = firebase.storage().ref();
    connectionRef: any = firebase.database().ref('.info/connected');

    defaultImageUrl: string;
    connected: boolean = false;

    constructor(public storage:LocalStorageService) {
        var self = this;
        try {
            self.checkFirebaseConnection();
            /*
            self.storageRef.child('images/default/profile.png').getDownloadURL().then(function (url) {
                self.defaultImageUrl = url.split('?')[0] + '?alt=media';
            });
            */
            self.InitData();
        } catch (error) {
            console.log('Data Service error:' + error);
        }
    }

    checkFirebaseConnection() {
        try {
            var self = this;
            var connectedRef = self.getConnectionRef();
            connectedRef.on('value', function (snap) {
                console.log(snap.val());
                if (snap.val() === true) {
                    console.log('Firebase: Connected:');
                    self.connected = true;
                } else {
                    console.log('Firebase: No connection:');
                    self.connected = false;
                }
            });
        } catch (error) {
            self.connected = false;
        }
    }

    isFirebaseConnected() {
        return this.connected;
    }

    private InitData() {
        let self = this;
        // Set statistics/threads = 1 for the first time only
        self.getStatisticsRef().child('threads').transaction(function (currentRank) {
            if (currentRank === null) {
                return 1;
            }
        }, function (error, committed, snapshot) {
            if (error) {
                console.log('Transaction failed abnormally!', error);
            } else if (!committed) {
                console.log('We aborted the transaction because there is already one thread.');
            } else {
                console.log('Threads number initialized!');

                let thread: IThread = {
                    key: null,
                    title: 'Selamat Datang Di Forum Toko My Friends!',
                    question: 'Hello World.',
                    category: 'system',
                    dateCreated: new Date().toString(),
                    user: { uid: 'default', username: 'System', image:'assets/img/elzumi.png' },
                    comments: 0
                };

                let firstThreadRef = self.threadsRef.push();
                firstThreadRef.setWithPriority(thread, 1).then(function (dataShapshot) {
                    console.log('Congratulations! You have created the first thread!');
                });
            }
            console.log('commited', snapshot.val());
        }, false);
    }

    getDatabaseRef() {
        return this.databaseRef;
    }

    getConnectionRef() {
        return this.connectionRef;
    }

    goOffline() {
        firebase.database().goOffline();
    }

    goOnline() {
        firebase.database().goOnline();
    }

    getDefaultImageUrl() {
        return this.defaultImageUrl;
    }

    getTotalThreads() {
        return this.statisticsRef.child('threads').once('value');
    }

    getThreadsRef() {
        return this.threadsRef;
    }

    getCommentsRef() {
        return this.commentsRef;
    }

    getStatisticsRef() {
        return this.statisticsRef;
    }

    getUsersRef() {
        return this.usersRef;
    }

    getStorageRef() {
        return this.storageRef;
    }

    getThreadCommentsRef(threadKey: string) {
        return this.commentsRef.orderByChild('thread').equalTo(threadKey);
    }

    loadThreads() {
        return this.threadsRef.once('value');
    }

    submitThread(thread: IThread, priority: number) {

        var newThreadRef = this.threadsRef.push();
        this.statisticsRef.child('threads').set(priority);
        console.log(priority);
        return newThreadRef.setWithPriority(thread, priority);
    }
    deletethread(thread: IThread) {
        return new Promise<any>((resolve, reject) => {
           
            const ref = firebase.database().ref('comments');
            ref.orderByChild('threads').equalTo(thread.key).once('value', snapshot => {
                 const updates = {};
                 snapshot.forEach(child => updates[child.key] = null);
                 ref.update(updates);
            });
                      this.threadsRef.child(thread.key).set(null).then(
                          res => {
                            this.statisticsRef.child('/threads').once('value')
                            .then((snapshot) => {
                                let numberOfComments = snapshot == null ? 0 : snapshot.val();
                                this.statisticsRef.child('/threads').set(numberOfComments - 1);
                            });
                              resolve(res) 
                          },
                          err => reject(err)
                        )
                      })
    }

    addThreadToFavorites(userKey: string, threadKey: string) {
        return this.usersRef.child(userKey + '/favorites/' + threadKey).set(true);
    }

    getFavoriteThreads(user: string) {
        return this.usersRef.child(user + '/favorites/').once('value');
    }

    setUserImage(uid: string) {
        this.usersRef.child(uid).update({
            image: true
        });
    }

    loadComments(threadKey: string) {
        return this.commentsRef.orderByChild('thread').equalTo(threadKey).once('value');
    }

    submitComment(threadKey: string, comment: IComment) {
        // let commentRef = this.commentsRef.push();
        // let commentkey: string = commentRef.key;
        this.commentsRef.child(comment.key).set(comment);

        return this.threadsRef.child(threadKey + '/comments').once('value')
            .then((snapshot) => {
                let numberOfComments = snapshot == null ? 0 : snapshot.val();
                this.threadsRef.child(threadKey + '/comments').set(numberOfComments + 1);
            });
    }
    deletetcomment( threadKey,comment: IComment) {
        return new Promise<any>((resolve, reject) => {
this.threadsRef.child(threadKey + '/comments').once('value')
            .then((snapshot) => {
                let numberOfComments = snapshot == null ? 0 : snapshot.val();
                this.threadsRef.child(threadKey + '/comments').set(numberOfComments - 1);
            });
          this.commentsRef.child(comment.key).set(null).then(
              res => {
                 
                  resolve(res) 
              },
              err => reject(err)
            )
          })
      
    }
    voteComment(commentKey: string, like: boolean, user: string): any {
        let commentRef = this.commentsRef.child(commentKey + '/votes/' + user);
        return commentRef.set(like);
    }

    getUsername(userUid: string) {
        return this.usersRef.child(userUid + '/username').once('value');
    }

    getUser(userUid: string) {
        return this.usersRef.child(userUid).once('value');
    }

    getUserThreads(userUid: string) {
        return this.threadsRef.orderByChild('user/uid').equalTo(userUid).once('value');
    }

    getUserComments(userUid: string) {
        return this.commentsRef.orderByChild('user/uid').equalTo(userUid).once('value');
    }
}