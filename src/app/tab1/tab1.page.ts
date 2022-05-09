import { AfterViewInit, OnInit, Component, ElementRef, ViewChild, NgZone } from '@angular/core';
import { NavController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Geolocation, GeolocationOptions , Geoposition , PositionError } from '@ionic-native/geolocation/ngx';
import { Capacitor } from '@capacitor/core';
import { LocationService } from '../location.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SMS } from '@ionic-native/sms/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';



declare var google;

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit, AfterViewInit {
  
  options : GeolocationOptions;
  currentPos : Geoposition;
  @ViewChild('mapElement', {static: false}) mapElement;
  map;
  latitude: any;
  longitude: any;
  watchId: any;
  constructor(private socialSharing: SocialSharing, private sms: SMS, private alertController: AlertController,private http: HttpClient, public ngZone: NgZone,private Toast: ToastController, private geolocation: Geolocation, private navController: NavController, private loadingController: LoadingController, private locationService: LocationService) {  }

ngOnInit(): void {

}

ngAfterViewInit(): void {
  this.getMyLocation();
}

async getMyLocation() {
  const hasPermission = await this.locationService.checkGPSPermission();
  if (hasPermission) {
    if (Capacitor.isNative) {
      const canUseGPS = await this.locationService.askToTurnOnGPS();
      this.postGPSPermission(canUseGPS);
    }
    else { this.postGPSPermission(true); }
  }
  else {
    const permission = await this.locationService.requestGPSPermission();
    if (permission === 'CAN_REQUEST' || permission === 'GOT_PERMISSION') {
      if (Capacitor.isNative) {
        const canUseGPS = await this.locationService.askToTurnOnGPS();
        this.postGPSPermission(canUseGPS);
      }
      else { this.postGPSPermission(true); }
    }
    else {
      await this.Toast.create({
        message: 'User denied location permission'
      })
    }
  }
}

async postGPSPermission(canUseGPS: boolean) {
  if (canUseGPS) { this.getUserPosition(); }
  else {
    await this.Toast.create({
      message: 'Please turn on GPS to get location'
    })
  }
}


async watchPosition() {

    console.log('TRY watchPosition')

    this.watchId = this.geolocation.watchPosition();    
    this.watchId.subscribe({}, (position : Geoposition, err) => {
      this.ngZone.run(() => {
        console.log('enter ngZone');
        if (err) { console.log('err', err); return; }
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude
        //this.clearWatch();
        console.log('Geoposition: '+position);
        this.addMap(position.coords.latitude,position.coords.longitude);
      })
    });
  
}
// clearWatch() {
//   if (this.watchId != null) {
//     Geolocation.clearWatch({ id: this.watchId });
//   }
// }

async getUserPosition(){
  const loading = await this.loadingController.create({
      message: 'Getting Location...',
      cssClass: 'my-custom-class'
  });
  await loading.present();

  this.options = {
  enableHighAccuracy : true
  };
  this.geolocation.getCurrentPosition(this.options).then((pos : Geoposition) => {

      this.currentPos = pos;  

      this.latitude = pos.coords.latitude;
      this.longitude = pos.coords.longitude;

      console.log(pos);
      this.addMap(pos.coords.latitude,pos.coords.longitude);
      loading.dismiss();
  },(err : PositionError)=>{
      console.log("error : " + err.message);
  ;
  })
}
 
  addMap(lat,long){

    let latLng = new google.maps.LatLng(parseFloat(lat), parseFloat(long));


    this.map = new google.maps.Map(
      this.mapElement.nativeElement,
      {
        center: latLng,
        zoom: 17,
        mapTMapTypeId: google.maps.MapTypeId.ROADMAP
      });
    this.addMarker();
} 
addMarker(){

  let marker = new google.maps.Marker({
  map: this.map,
  animation: google.maps.Animation.DROP,
  position: this.map.getCenter()
  });

  let content = "<p>This is your current position</p>";          
  let infoWindow = new google.maps.InfoWindow({
  content: content
  });

  google.maps.event.addListener(marker, 'click', () => {
  infoWindow.open(this.map, marker);
  });

}
async shareLocation(){
  const loading = await this.loadingController.create({
      message: 'sending...',
      cssClass: 'my-custom-class'
  });
  await loading.present();
  var googleMapsLocation = "My Current Location: https://www.google.com/maps/search/?api=1%26query="+this.latitude+","+this.longitude+"%26z=17";
  const httpOptions = {
    headers: new HttpHeaders({
      'Content-Type':  'application/json'
      })
    }; 
    var link = 'https://www.bulksmsnigeria.com/api/v1/sms/create?api_token=2n3a60wMhr1eS31OtMoo7ez8t4n89Mxn5mxaWB2GQsPpbgcWqFwbBEJPi422&from=Trouve&to=2347033690594&body='+googleMapsLocation+'&dnd=2';
    this.http.post(link, {responseType: 'text'}).subscribe(data =>{
      loading.dismiss();
        
        var alert = this.alertController.create({
          message: '<img src = "../assets/checkmark_2.gif" style="width: 70px; height: 70px">',
          buttons:[{
            text: 'OKAY',
            cssClass: 'exit-button'
          }],
          mode: 'ios',
          cssClass: 'my-custom-alert'
        }).then((alert)=>{
          alert.present();
        });
    }, error => {
      console.log(error.message);
    });
  }
  async shareLocationSMS(){
    const loading = await this.loadingController.create({
      message: 'sending...',
      cssClass: 'my-custom-class'
    });
    await loading.present();
    this.checkSMSPermission();
    var googleMapsLocation = "My Current Location: https://www.google.com/maps/search/?api=1&query="+this.latitude+","+this.longitude+"&z=17";
    if(this.sms.hasPermission){
      console.log('User has Permission: '+this.sms.hasPermission)
      loading.dismiss();
      this.sms.send('07033690594',googleMapsLocation).then(success =>{
        if(success == 'OK'){
          loading.dismiss();
        
          var alert = this.alertController.create({
            message: '<img src = "../assets/checkmark_2.gif" style="width: 70px; height: 70px">',
            buttons:[{
              text: 'OKAY',
              cssClass: 'exit-button'
            }],
            mode: 'ios',
            cssClass: 'my-custom-alert'
          }).then((alert)=>{
            alert.present();
          });
        }
        else{
          var alertFailedSMS = this.alertController.create({
            message: 'SMS Sending Failed. Reason: '+success,
            buttons:[{
              text: 'OKAY',
              cssClass: 'exit-button'
            }],
            mode: 'ios',
            cssClass: 'my-custom-class'
          }).then((alertFailedSMS) =>{
            alertFailedSMS.present();
          })
        }
      }).catch(e => {
        console.log('SMS Failed: '+e);
      });
    }
    else{
      loading.dismiss();
      console.log('There is NO SMS Permission');
    }
  }
  checkSMSPermission(){
    AndroidPermissions.checkPermission(AndroidPermissions.PERMISSION.SEND_SMS).then(result => {
      result => console.log('Has SMS Permission? ', result.hasPermission);
    }).catch((error) =>{
      console.log(error);
    });
  }

  async shareLocationWhatsApp(){
    var googleMapsLocation = "Please find Me, I need HELP!: https://www.google.com/maps/search/?api=1&query="+this.latitude+","+this.longitude+"&z=17";
    
    this.socialSharing.canShareVia('whatsapp').then((resp)=>{
      if(resp=='OK'){
        this.socialSharing.shareViaWhatsAppToPhone('+2348034431103',googleMapsLocation,null).then((resp) =>{
          var alert = this.alertController.create({
            message: '<img src = "../assets/checkmark_2.gif" style="width: 70px; height: 70px">',
            buttons:[{
              text: 'OKAY',
              cssClass: 'exit-button'
            }],
            mode: 'ios',
            cssClass: 'my-custom-alert'
          }).then((alert)=>{
            alert.present();
          });
        }).catch(e => {
          const alert = this.alertController.create({
            message: 'Sending Via WhatsApp Failed.: '+e,
            buttons: ['OK'],
            cssClass: 'my-custom-class'
          }).then(alert =>{
            alert.present();
          });        
        });
      }
      else{
        const alert = this.alertController.create({
          message: 'Please Check your permission settings on WhatsApp.'+resp,
          buttons: ['OK'],
          cssClass: 'my-custom-class'
        }).then(alert =>{
          alert.present();
        });
      }
    }).catch(err =>{
      const alert = this.alertController.create({
        message: 'Please Check your permission settings on WhatsApp.'+err,
        buttons: ['OK'],
        cssClass: 'my-custom-class'
      }).then(alert =>{
        alert.present();
      });    
    });
  }
}
