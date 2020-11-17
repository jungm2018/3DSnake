window.Team_Slytherin_Project = window.classes.Team_Slytherin_Project =
class Team_Slytherin_Project extends Scene_Component
  {
    constructor(context, control_box)     // The scene begins by requesting the camera, shapes, and materials it will need.
      {
        super(context, control_box);    // First, include a secondary Scene that provides movement controls:
        // if(!context.globals.has_controls)
        //   context.register_scene_component(new Movement_Controls(context, control_box.parentElement.insertCell()));

        context.globals.graphics_state.camera_transform = Mat4.look_at(Vec.of(0,50,-20), Vec.of(0,0,0), Vec.of(0,1,0));
        this.initial_camera_location = Mat4.inverse(context.globals.graphics_state.camera_transform);
        this.attached = () => this.initial_camera_location;

        const r = context.width/context.height;
        context.globals.graphics_state.projection_transform = Mat4.perspective(Math.PI/4, r, .1, 1000);

        const shapes =
        {
          square: new Square(),
          cube:   new Cube(),
          sphere: new Subdivision_Sphere(4),
          ball:   new (Subdivision_Sphere)(4),
          walls: new Cube(),
          sky: new Cube(),
          text: new Text_Line(35)
        }

        // shapes.sphere.texture_coords = shapes.sphere.texture_coords.map(v => Vec.of(v[0], v[1] * 2));
        shapes.walls.texture_coords = shapes.walls.texture_coords.map(v => Vec.of(v[0] * 5, v[1] * .5));
        shapes.sky.texture_coords = shapes.sky.texture_coords.map(v => Vec.of(v[0] * 10, v[1] * 10));

        this.submit_shapes(context, shapes);

        this.materials =
        {
          test: context.get_instance( Phong_Shader ).material( Color.of( 1,1,0,1 ), { ambient: .5 } ),
          apple: context.get_instance( Phong_Shader ).material(Color.of(0,0,0,1),
                 {
                   ambient: 1,
                   specularity: 0,
                   texture: context.get_instance("./assets/apple.jpg")
                 }),
          snake_skin: context.get_instance( Phong_Shader ).material(Color.of(0,0,0,1),
                 {
                   ambient: 1,
                   specularity: 0,
                   texture: context.get_instance("./assets/snake3.png")
                 }),
          rat: context.get_instance( Phong_Shader ).material(Color.of(5,5,5,1),
                 {
                   ambient: 1,
                   specularity: 0
                 }),
          ball: context.get_instance(Phong_Shader).material(Color.of(5, 0.5, 0.5, 1), { ambient:  1 } ),
          floor: context.get_instance(Phong_Shader).material(Color.of(0,0,0,1),
                 {
                   ambient: .8,
                   texture: context.get_instance("./assets/floor.jpg", true)
                 }),
          walls: context.get_instance(Phong_Shader).material(Color.of(0,0,0,1),
                {
                 ambient: 1,
                 texture: context.get_instance("./assets/walls.jpg", true)
                }),
          sky : context.get_instance(Phong_Shader).material(Color.of(0,0,0,1),
                {
                    ambient: 1,
                    texture: context.get_instance("./assets/sky.png", true)
                }),
          'text_image': context.get_instance(Phong_Shader).material(Color.of(1, 1, 1, 1), {
            ambient: 1,
            diffusivity: 0,
            specularity: 0,
            texture: context.get_instance("assets/black_text.png", false)
          })
        }



        this.curr_x_rat = 3;
        this.curr_z_rat = 3;

        //SNAKE PARAMS
        this.velocity = 5;
        let snake_array = [];
        this.max_len = 1000;
        this.curr_len = 4;
        this.points = 100*this.curr_len;
        this.initial_length = this.max_len;
        for (let i = 0; i < this.initial_length; i++) {
          snake_array.push([0,-0.1*i]);
        }
        this.snake_array = snake_array;
        this.shake = [false, 0];
        this.collision_timer = 0;
        this.theta = 0;

        this.lights = [ new Light( Vec.of( 5,-10,5,1 ), Color.of( 0, 1, 1, 1 ), 1000 ) ];

        this.objects = []; // Keeps the model transforms of each object and walls using object literals

        this.snake_transforms = []; // Stores the model transforms of the snake, first element is the head
        for (let i = 0; i < this.curr_len; i++){
          let transform_model = Mat4.translation([0, 0, -2*i]);
          this.snake_transforms.push({transform: transform_model, type: 'snake'});



        }
      }

      // Not implemented yet
      make_control_panel()            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
      {
        this.key_triggered_button("Speed Up", [ "w" ], () => {
         this.velocity += 0.5;
        });
        this.key_triggered_button("Slow Down", [ "s" ], ()=> {
          if (this.velocity >= 5.5) this.velocity -= 0.5;
        });
        this.new_line();
        this.key_triggered_button("Turn Left", [ "a" ], () => {
          this.theta += Math.PI/40;
        });
        this.key_triggered_button("Turn Right", [ "d" ], () => {
          this.theta -= Math.PI/40;
        });
        this.key_triggered_button("Increase Size", [ "5" ], () => {
          this.curr_len += 1;
        });
        this.key_triggered_button( "Attach to Head", [ "6" ], () => this.attached = () => this.snake_transforms[0].transform);
        this.key_triggered_button( "Bird's Eye View", [ "7" ], () => this.attached = () => this.initial_camera_location );

        this.new_line();
      }

      generate_map(size, graphics_state)
      {
        let model =
        {
          transform: Mat4.identity(),
          type: "wall"
        }

        //Create floor
        model.transform = model.transform.times(Mat4.rotation(Math.PI * .5, Vec.of(1,0,0)))
                                         .times(Mat4.scale([size, size, 1]));
        this.shapes.square.draw(graphics_state, model.transform, this.materials.floor);

        // Create Walls

        // Add walls model transform only at the very beginning of the scene.
        if(this.objects.length < 4)
        {
          // Left wall
          model.transform = Mat4.identity().times(Mat4.translation([-size - 1, 1, 0]))
                                           .times(Mat4.scale([1, 3, size]));
          this.objects.push(Object.assign({}, model));

          // Right wall
          model.transform = model.transform.times(Mat4.translation([2 * size + 2, 0, 0]));
          this.objects.push(Object.assign({}, model));

          // Bottom wall
          model.transform = Mat4.identity().times(Mat4.translation([0, 1, -size - 1]))
                            .times(Mat4.scale([size + 2, 3, 1]));
          this.objects.push(Object.assign({}, model));

          // Top wall
          model.transform = model.transform.times(Mat4.translation([0, 0, 2 * size + 2]));
          this.objects.push(Object.assign({}, model));
        }

        // Draw the walls
        for(let i = 0; i < 4; i++)
          this.shapes.walls.draw(graphics_state, this.objects[i].transform, this.materials.walls);
      }

      
      // generate_rats(size, graphics_state, objects_limit){
      //   let model = Mat4.identity();
      //   let random_direction = Math.floor((Math.random()*8) + 1);
      //   let curr_x_snake_head = this.snake_array[0][0];
      //   let curr_z_snake_head = this.snake_array[0][1];

      //   let curr_x_distance = curr_x_snake_head - this.curr_x_rat;
      //   let curr_z_distance = curr_z_snake_head - this.curr_z_rat;
      //   let distance = Math.sqrt(curr_x_distance**2 + curr_z_distance**2);

      //   // it is priority that the rat should go toward x direction.
      //   if(distance < 10){
      //     if(Math.abs(curr_z_distance) > Math.abs(curr_x_distance)){

      //         if (curr_x_snake_head - this.curr_x_rat > 0){
      //           if(Math.abs(this.curr_x_rat) < 19)
      //             this.curr_x_rat -= 0.1*this.velocity;
      //           else{
      //             if(curr_z_distance < 0 && Math.abs(this.curr_x_rat) < 19){
      //               this.curr_x_rat += 0.1*this.velocity;
      //             }
      //             if(curr_z_distance >= 0 && Math.abs(this.curr_x_rat) < 19){
      //               this.curr_x_rat -= 0.1*this.velocity;
      //             }
      //           }
      //         }
      //         else{
      //           if(Math.abs(this.curr_x_rat) < 19)
      //             this.curr_x_rat += 0.1*this.velocity;
      //           else{
      //             if(curr_z_distance < 0 && Math.abs(this.curr_x_rat) < 19){
      //               this.curr_x_rat += 0.1*this.velocity;
      //             }
      //             if(curr_z_distance >= 0 && Math.abs(this.curr_x_rat) < 19){
      //               this.curr_x_rat -= 0.1*this.velocity;
      //             }
      //           }
      //         }
      //       // if rat is too far away from snake
      //       // the rat does not move 
      //     }

      //     // it is priority that the rat should go toward z direction
      //     else{  
      //       if(distance < 10){
      //         if (curr_z_snake_head - this.curr_z_rat > 0){
      //           if(Math.abs(this.curr_z_rat) < 19)
      //             this.curr_z_rat -= 0.1*this.velocity;
      //           else{
      //             if(curr_x_distance < 0 && Math.abs(this.curr_z_rat) < 19){
      //               this.curr_x_rat += 0.1*this.velocity;
      //             }
      //             if(curr_x_distance >= 0 && Math.abs(this.curr_z_rat) < 19){
      //               this.curr_x_rat -= 0.1*this.velocity;
      //             }
      //           }
      //         }
      //         else{
      //           if(Math.abs(this.curr_z_rat) < 19)
      //             this.curr_z_rat += 0.1*this.velocity;
      //           else{
      //             if(curr_x_distance < 0 && Math.abs(this.curr_z_rat) < 19){
      //               this.curr_z_rat += 0.1*this.velocity;
      //             }
      //             if(curr_x_distance >= 0 && Math.abs(this.curr_z_rat) < 19){
      //               this.curr_z_rat -= 0.1*this.velocity;
      //             }
      //           }
      //         }
      //       }
      //     }
      //   } // the end of the distance < 10


      //   let curr_x = this.curr_x_rat;
      //   let curr_z = this.curr_z_rat;
      //   model = model.times(Mat4.translation([curr_x, 1, curr_z]));
      //   this.shapes.sphere.draw(graphics_state, model, this.materials.rat);
      // }



      generate_objects(size, graphics_state, objects_limit) // Creates objects at random locations within map
      {
        let model =
        {
          transform: Mat4.identity(),
          type: "apple"
        }
        // this.objects.length --> after the wall
        // by the number of index
        for(let i = this.objects.length; i < objects_limit; i++)
        {

          let random_x = Math.random() * (2 * (size - 1)) - (size - 1);
          let random_z = Math.random() * (2 * (size - 1)) - (size - 1);
          model.transform = Mat4.identity().times(Mat4.translation([random_x, 1, random_z]));
          if(this.check_collision(model.transform, i) == -1) this.objects.push(Object.assign({}, model));
          else i--;
        }

        if(this.objects.length != 0)
          for(let i = 0; i < objects_limit; i++)
            this.shapes.sphere.draw(graphics_state, this.objects[i].transform, this.materials.apple);

     }

      // TODO: include snake transforms
      // When checking collision for head of snake. index = this.objects.length - 1 + index
      // If the value returned is greater than this.objects.length, we have a head-snake collision
      check_collision(model_transform, index)
      {
        let objects = this.objects.concat(this.snake_transforms.slice(0, this.curr_len));
        let sphere = new Subdivision_Sphere(4);
        let m_inverse = Mat4.inverse(model_transform);
        for(let i = 0; i < objects.length; i++)
        {
          if(i == index) continue;
          let T = m_inverse.times(objects[i].transform);
          for(let j = 0; j < sphere.positions.length; j++)
          {
            let T_p = T.times(sphere.positions[j].to4(1));
            if(T_p.to3().norm() < 1)
              return i;
          }
        }
        return -1;
      }

      draw_snake(graphics_state){
        let prev_x = this.snake_array[0][0];
        let prev_z = this.snake_array[0][1];
        let len_count = 0;
        for (let i = 0; i < this.initial_length; i++){
          if (len_count == this.curr_len) continue;
          let pos = this.snake_array[i],
              x = pos[0],
              z = pos[1],
              diff = Math.sqrt((prev_x-x)**2 + (prev_z-z)**2);
          if (diff > 2 || i == 0){
            let model_transform = Mat4.translation([x, 1, z]);
            let model =
                {
                  transform: model_transform,
                  type: "snake"
                }
            this.snake_transforms[len_count] = Object.assign({}, model);
            this.shapes.ball.draw(graphics_state, model_transform, this.materials.snake_skin);
            prev_x = x;
            prev_z = z;
            len_count = len_count + 1;
          }
        }
      }

      move_snake(graphics_state){
        let dt = graphics_state.animation_delta_time / 1000,
            v = this.velocity,
            theta  = this.theta;
        if (dt == 0 || dt > 0.02) dt = 0.018;
        let prev_snake_array = this.snake_array,
            new_snake_array = [],
            head = prev_snake_array[0],
            x = head[0], z = head[1];
        x = x + v*dt*Math.sin(theta);
        z = z + v*dt*Math.cos(theta);
        new_snake_array.push([x, z]);
        for (let i = 0; i < this.initial_length - 1; i++){
          let temp = [prev_snake_array[i][0],prev_snake_array[i][1]];
          new_snake_array.push(temp);
        }
       this.snake_array = new_snake_array;
      }

      camera_calculations(graphics_state){
        let t = graphics_state.animation_time / 1000,
            dt = graphics_state.animation_delta_time / 1000,
            camera_matrix = this.attached(),
            camera_angle = Math.sin(20*t)/20,
            shake = this.shake[0],
            shake_time = this.shake[1]
        if (shake){
            shake_time = shake_time + dt;
            if (shake_time > 1) {
              this.shake[0] = false;
              this.shake[1] = 0;
              return;
            }
            this.shake[1] = shake_time
        }

        if (camera_matrix == this.initial_camera_location){
            if (shake)
                camera_matrix = camera_matrix.times(Mat4.rotation(camera_angle, Vec.of(0,1,0)));
            graphics_state.camera_transform = Mat4.inverse(camera_matrix)
              .map((x, i) => Vec.from(graphics_state.camera_transform[i]).mix(x, .1));
        } else {
          let x = this.snake_array[0][0],
              z = this.snake_array[0][1];
          if (shake)
              camera_matrix = camera_matrix.times(Mat4.rotation(30*camera_angle, Vec.of(0,1,0)));
          camera_matrix = Mat4.translation([x, 1, z]).times(Mat4.rotation(this.theta, Vec.of(0,1,0)))
              .times(Mat4.rotation(Math.PI, Vec.of(0,1,0)))
              .times(Mat4.translation([-x, 1, -z])).times(camera_matrix);
          let camera_snake_tranformation =
              Mat4.translation([0, -2, -10]).times(Mat4.inverse(camera_matrix));
          graphics_state.camera_transform = camera_snake_tranformation
              .map((x, i) => Vec.from(graphics_state.camera_transform[i]).mix(x, .1));
        }
        this.display_text(graphics_state, camera_matrix);
      }

    display_text(graphics_state, camera_matrix){
      let model_transform = camera_matrix;
      if( model_transform == this.initial_camera_location){
        model_transform = Mat4.translation([6.4, -7, 6.5]).times(model_transform).times(Mat4.scale([1/10, 1/10, 1/10]));
      }
      else{
        model_transform = model_transform.times(Mat4.translation([-0.5, 0, -0])).times(Mat4.scale([1/10, 1/10, 1/10]));
        //[-7.7, 6.1, -0]
      }
      model_transform = model_transform.times(Mat4.scale([3,3,3]));
      let line = "Points:" + this.points;
      this.shapes.text.set_string(line);
      this.shapes.text.draw(graphics_state, model_transform, this.materials.text_image);
    }

      delete_apple(index){
      //TODO: Add more stuff?
        this.objects.splice(index, 1);
      }

      snake_snake_collision(collision_index, graphics_state){
          //TODO: Snake to Snake Collision Handler
          let t = graphics_state.animation_time / 1000;
          if (t - this.collision_timer < 2) return;
          this.collision_timer = t;
          this.shake[0] = true;
          this.points -= 100*(this.curr_len - (collision_index - this.objects.length));
          this.curr_len = collision_index - this.objects.length;
      }

      snake_object_collision(collision_index){
        //TODO: Snake to Object Collision Handler
        if (this.objects[collision_index].type == 'apple'){
            this.points += 100
          this.delete_apple(collision_index);
          this.curr_len += 1;
          this.velocity += 0.5;
        }
        // TODO: play dead scene
        else if (this.objects[collision_index].type == 'wall')
        {
         window.alert("GAME OVER");
         exit();
        }
      }



      display(graphics_state)
      {
        const t = graphics_state.animation_time / 1000;
        graphics_state.lights = this.lights;        // Use the lights stored in this.lights.a
        let size = 20;
        let objects_limit = 12;
        this.generate_map(size, graphics_state);
        this.generate_objects(size, graphics_state, objects_limit);

        // this.generate_rats(size, graphics_state, objects_limit);

        this.move_snake(graphics_state);
        this.draw_snake(graphics_state);
        let collision_index = this.check_collision(this.snake_transforms[0].transform, this.objects.length);

        if (collision_index > this.objects.length) 
          this.snake_snake_collision(collision_index, graphics_state);
        
        else if (collision_index != -1) 
          this.snake_object_collision(collision_index);
        this.shapes.sky.draw(graphics_state, Mat4.scale([250, 200, 200]), this.materials.sky);
        this.camera_calculations(graphics_state);
      }
  }
